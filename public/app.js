const app = document.getElementById("app");

let token = localStorage.getItem("token");
let usuario = JSON.parse(localStorage.getItem("usuario") || "null");

function headers() {
return {
"Content-Type": "application/json",
Authorization: "Bearer " + token
};
}

function logout() {
localStorage.clear();
token = null;
usuario = null;
renderAuth();
}

function saveSession(data) {
token = data.token;
usuario = data.usuario;
localStorage.setItem("token", token);
localStorage.setItem("usuario", JSON.stringify(usuario));
}

function calendarLink(e) {
const title = encodeURIComponent(e.tarea || e.titulo || "Vencimiento");
const details = encodeURIComponent(e.descripcion || "");
const date = e.vencimiento ? e.vencimiento.replaceAll("-", "") : "";
return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}`;
}

function renderAuth() {
app.innerHTML = `
<div class="auth">
<h1>IusCloud PRO</h1>
<input id="authNombre" placeholder="Nombre / Estudio">
<input id="authEmail" placeholder="Email">
<input id="authPassword" type="password" placeholder="Contraseña">
<button onclick="register()">Crear cuenta</button>
<button onclick="login()">Ingresar</button>
<button onclick="alert('Google Login lo configuramos después con Google Cloud OAuth')">Ingresar con Google</button>
</div>
`;
}

async function register() {
const nombre = authNombre.value.trim();
const email = authEmail.value.trim();
const password = authPassword.value.trim();

const res = await fetch("/api/auth/register", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ nombre, email, password, estudio: nombre })
});

const data = await res.json();
if (!res.ok) return alert(data.error || "Error al registrar");

saveSession(data);
renderDashboard();
}

async function login() {
const email = authEmail.value.trim();
const password = authPassword.value.trim();

const res = await fetch("/api/auth/login", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ email, password })
});

const data = await res.json();
if (!res.ok) return alert(data.error || "Error al ingresar");

saveSession(data);
renderDashboard();
}

function layout(content) {
app.innerHTML = `
<div class="layout">
<aside class="sidebar">
<div class="logo">IC</div>
<h2>IusCloud</h2>
<small>${usuario?.estudio || "Mi estudio jurídico"}</small>

<button onclick="renderDashboard()">Dashboard</button>
<button onclick="renderClientes()">Clientes</button>
<button onclick="renderExpedientes()">Expedientes</button>
<button onclick="renderTipos()">Tipos de procesos</button>
<button onclick="renderModelos()">Modelos</button>
<button onclick="logout()">Cerrar sesión</button>
</aside>

<main class="main">
${content}
</main>
</div>
`;
}

async function renderDashboard() {
const res = await fetch("/api/dashboard", { headers: headers() });
if (res.status === 401) return logout();

const d = await res.json();

layout(`
<h1>Dashboard</h1>
<div class="cards">
<div class="card"><span>Clientes</span><strong>${d.clientes || 0}</strong></div>
<div class="card"><span>Expedientes</span><strong>${d.expedientes || 0}</strong></div>
<div class="card"><span>Tipos</span><strong>${d.tipos || 0}</strong></div>
<div class="card"><span>Modelos</span><strong>${d.modelos || 0}</strong></div>
</div>
`);
}

async function renderClientes(q = "") {
const res = await fetch("/api/clientes?q=" + encodeURIComponent(q), { headers: headers() });
if (res.status === 401) return logout();

const clientes = await res.json();

layout(`
<h1>Clientes</h1>

<input class="search" placeholder="Buscar por nombre, DNI, email o teléfono" oninput="renderClientes(this.value)">

<div class="form">
<input id="cNombre" placeholder="Nombre completo">
<input id="cDni" placeholder="DNI / CUIT">
<input id="cEmail" placeholder="Email">
<input id="cTelefono" placeholder="Teléfono">
<input id="cDomicilio" placeholder="Domicilio">
<textarea id="cObs" placeholder="Observaciones"></textarea>
<button onclick="guardarCliente()">Agregar cliente</button>
</div>

<div class="list">
${clientes.map(c => `
<div class="item">
<div>
<strong>${c.nombre || "Sin nombre"}</strong>
<p>${c.email || "Sin email"} · ${c.telefono || "Sin teléfono"} · ${c.dni || ""}</p>
</div>
<button onclick="eliminarCliente('${c._id}')">Eliminar</button>
</div>
`).join("")}
</div>
`);
}

async function guardarCliente() {
const body = {
nombre: cNombre.value,
dni: cDni.value,
email: cEmail.value,
telefono: cTelefono.value,
domicilio: cDomicilio.value,
observaciones: cObs.value
};

const res = await fetch("/api/clientes", {
method: "POST",
headers: headers(),
body: JSON.stringify(body)
});

if (!res.ok) return alert("No se pudo guardar cliente");
renderClientes();
}

async function eliminarCliente(id) {
await fetch("/api/clientes/" + id, { method: "DELETE", headers: headers() });
renderClientes();
}

async function renderExpedientes() {
const clientesRes = await fetch("/api/clientes", { headers: headers() });
const expRes = await fetch("/api/expedientes", { headers: headers() });

if (expRes.status === 401) return logout();

const clientes = await clientesRes.json();
const expedientes = await expRes.json();

layout(`
<h1>Expedientes</h1>

<div class="form">
<input id="eTitulo" placeholder="Carátula / Título">
<input id="eNumero" placeholder="Número de expediente">
<input id="eJuzgado" placeholder="Juzgado">

<select id="eCliente">
<option value="">Seleccionar cliente</option>
${clientes.map(c => `<option value="${c.nombre || ""}">${c.nombre || "Sin nombre"}</option>`).join("")}
</select>

<input id="eTipo" placeholder="Tipo de proceso">
<input id="eVencimiento" type="date">
<input id="eTarea" placeholder="Tarea / vencimiento">
<input id="eEstado" placeholder="Estado">
<textarea id="eDesc" placeholder="Descripción"></textarea>

<button onclick="guardarExpediente()">Agregar expediente</button>
</div>

<div class="list">
${expedientes.map(e => `
<div class="item">
<div>
<strong>${e.titulo || "Sin título"}</strong>
<p>${e.numero || ""} · ${e.juzgado || ""} · ${e.cliente || ""}</p>
<p>Vencimiento: ${e.vencimiento || "Sin fecha"}</p>
</div>
<div>
${e.vencimiento ? `<a target="_blank" href="${calendarLink(e)}">Google Calendar</a>` : ""}
<button onclick="eliminarExpediente('${e._id}')">Eliminar</button>
</div>
</div>
`).join("")}
</div>
`);
}

async function guardarExpediente() {
const body = {
titulo: eTitulo.value,
numero: eNumero.value,
juzgado: eJuzgado.value,
cliente: eCliente.value,
tipo: eTipo.value,
vencimiento: eVencimiento.value,
tarea: eTarea.value,
estado: eEstado.value,
descripcion: eDesc.value
};

const res = await fetch("/api/expedientes", {
method: "POST",
headers: headers(),
body: JSON.stringify(body)
});

if (!res.ok) return alert("No se pudo guardar expediente");
renderExpedientes();
}

async function eliminarExpediente(id) {
await fetch("/api/expedientes/" + id, { method: "DELETE", headers: headers() });
renderExpedientes();
}

async function renderTipos() {
const res = await fetch("/api/tipos", { headers: headers() });
if (res.status === 401) return logout();

const tipos = await res.json();

layout(`
<h1>Tipos de procesos</h1>

<div class="form">
<input id="tNombre" placeholder="Nombre del tipo de proceso">
<textarea id="tDesc" placeholder="Descripción"></textarea>
<button onclick="guardarTipo()">Agregar tipo</button>
</div>

<div class="list">
${tipos.map(t => `
<div class="item">
<div>
<strong>${t.nombre || "Sin nombre"}</strong>
<p>${t.descripcion || ""}</p>
</div>
<button onclick="eliminarTipo('${t._id}')">Eliminar</button>
</div>
`).join("")}
</div>
`);
}

async function guardarTipo() {
const res = await fetch("/api/tipos", {
method: "POST",
headers: headers(),
body: JSON.stringify({
nombre: tNombre.value,
descripcion: tDesc.value
})
});

if (!res.ok) return alert("No se pudo guardar tipo");
renderTipos();
}

async function eliminarTipo(id) {
await fetch("/api/tipos/" + id, { method: "DELETE", headers: headers() });
renderTipos();
}

async function renderModelos() {
const res = await fetch("/api/modelos", { headers: headers() });
if (res.status === 401) return logout();

const modelos = await res.json();

layout(`
<h1>Modelos</h1>

<div class="form">
<input id="mTitulo" placeholder="Título del modelo">
<input id="mTipo" placeholder="Tipo">
<textarea id="mContenido" placeholder="Contenido del modelo"></textarea>
<button onclick="guardarModelo()">Agregar modelo</button>
</div>

<div class="list">
${modelos.map(m => `
<div class="item">
<div>
<strong>${m.titulo || "Sin título"}</strong>
<p>${m.tipo || ""}</p>
<pre>${m.contenido || ""}</pre>
</div>
<button onclick="eliminarModelo('${m._id}')">Eliminar</button>
</div>
`).join("")}
</div>
`);
}

async function guardarModelo() {
const res = await fetch("/api/modelos", {
method: "POST",
headers: headers(),
body: JSON.stringify({
titulo: mTitulo.value,
tipo: mTipo.value,
contenido: mContenido.value
})
});

if (!res.ok) return alert("No se pudo guardar modelo");
renderModelos();
}

async function eliminarModelo(id) {
await fetch("/api/modelos/" + id, { method: "DELETE", headers: headers() });
renderModelos();
}

if (token) {
renderDashboard();
} else {
renderAuth();
}