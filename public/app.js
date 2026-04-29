const app = document.getElementById("app");

let token = localStorage.getItem("token");
let usuario = JSON.parse(localStorage.getItem("usuario") || "null");

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token
  };
}

function saveSession(data) {
  token = data.token;
  usuario = data.usuario;
  localStorage.setItem("token", token);
  localStorage.setItem("usuario", JSON.stringify(usuario));
}

function logout() {
  localStorage.clear();
  token = null;
  usuario = null;
  renderAuth();
}

function calendarLink(exp) {
  const title = encodeURIComponent(exp.tarea || exp.titulo || "Vencimiento");
  const details = encodeURIComponent(exp.descripcion || "");
  const date = exp.vencimiento ? exp.vencimiento.replaceAll("-", "") : "";
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}';
}

function renderAuth() {
  app.innerHTML = `
    <div class="auth">
      <div class="auth-card">
        <h1>IusCloud PRO</h1>
        <p>Gestión jurídica para estudios</p>

        <input id="authNombre" placeholder="Nombre / Estudio">
        <input id="authEmail" placeholder="Email">
        <input id="authPassword" type="password" placeholder="Contraseña">

        <button onclick="login()">Ingresar</button>
        <button class="secondary" onclick="register()">Crear cuenta</button>
        <button class="google" onclick="alert('Google Login se configura después con Google Cloud OAuth')">Ingresar con Google</button>
      </div>
    </div>
  `;
}

async function login() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) return alert(data.error || "No se pudo ingresar");

  saveSession(data);
  renderApp("dashboard");
}

async function register() {
  const nombre = document.getElementById("authNombre").value.trim();
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password, estudio: nombre })
  });

  const data = await res.json();
  if (!res.ok) return alert(data.error || "No se pudo crear cuenta");

  saveSession(data);
  renderApp("dashboard");
}

function layout(content) {
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="logo">IC</div>
        <h2>IusCloud</h2>
        <small>${usuario?.estudio || "Estudio jurídico"}</small>

        <nav>
          <button onclick="renderApp('dashboard')">Dashboard</button>
          <button onclick="renderApp('clientes')">Clientes</button>
          <button onclick="renderApp('expedientes')">Expedientes</button>
          <button onclick="renderApp('tipos')">Tipos de procesos</button>
          <button onclick="renderApp('modelos')">Modelos</button>
        </nav>

        <button class="logout" onclick="logout()">Cerrar sesión</button>
      </aside>

      <main class="main">${content}</main>
    </div>
  `;
}

async function renderApp(section) {
  if (!token) return renderAuth();

  if (section === "dashboard") return renderDashboard();
  if (section === "clientes") return renderClientes();
  if (section === "expedientes") return renderExpedientes();
  if (section === "tipos") return renderTipos();
  if (section === "modelos") return renderModelos();
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
    <section class="panel">
      <h2>Resumen</h2>
      <p>Bienvenida/o a tu estudio jurídico digital.</p>
    </section>
  `);
}

async function renderClientes(q = "") {
  const res = await fetch("/api/clientes?q=" + encodeURIComponent(q), { headers: headers() });
  if (res.status === 401) return logout();

  const clientes = await res.json();

  layout(`
    <h1>Clientes</h1>

    <section class="panel">
      <input id="buscarCliente" placeholder="Buscar por nombre, DNI, email o teléfono" oninput="renderClientes(this.value)">
    </section>

    <section class="panel">
      <div class="grid">
        <input id="cNombre" placeholder="Nombre completo">
        <input id="cDni" placeholder="DNI / CUIT">
        <input id="cEmail" placeholder="Email">
        <input id="cTelefono" placeholder="Teléfono">
        <input id="cDomicilio" placeholder="Domicilio">
        <textarea id="cObs" placeholder="Observaciones"></textarea>
      </div>
      <button onclick="guardarCliente()">Agregar cliente</button>
    </section>

    <section class="list">
      ${clientes.map(c => `
        <div class="item">
          <div>
            <strong>${c.nombre || "Sin nombre"}</strong>
            <p>${c.email || "Sin email"} · ${c.telefono || "Sin teléfono"} · ${c.dni || ""}</p>
          </div>
          <button class="danger" onclick="eliminarCliente('${c._id}')">Eliminar</button>
        </div>
      `).join("")}
    </section>
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
  await fetch("/api/clientes/" + id, {
    method: "DELETE",
    headers: headers()
  });
  renderClientes();
}

async function renderExpedientes() {
  const res = await fetch("/api/expedientes", { headers: headers() });
  if (res.status === 401) return logout();

  const expedientes = await res.json();

  layout(`
    <h1>Expedientes</h1>

    <section class="panel">
      <div class="grid">
        <input id="eTitulo" placeholder="Carátula / Título">
        <input id="eNumero" placeholder="Número de expediente">
        <input id="eJuzgado" placeholder="Juzgado">
        <input id="eCliente" placeholder="Cliente">
        <input id="eTipo" placeholder="Tipo de proceso">
        <input id="eVencimiento" type="date">
        <input id="eTarea" placeholder="Tarea / vencimiento">
        <input id="eEstado" placeholder="Estado">
        <textarea id="eDesc" placeholder="Descripción"></textarea>
      </div>
      <button onclick="guardarExpediente()">Agregar expediente</button>
    </section>

    <section class="list">
      ${expedientes.map(e => `
        <div class="item">
          <div>
            <strong>${e.titulo || "Sin título"}</strong>
            <p>${e.numero || ""} · ${e.juzgado || ""} · ${e.cliente || ""}</p>
            <p>Vencimiento: ${e.vencimiento || "Sin fecha"}</p>
          </div>
          <div>
            ${e.vencimiento ? <a class="calendar" target="_blank" href="${calendarLink(e)}">Google Calendar</a> : ""}
            <button class="danger" onclick="eliminarExpediente('${e._id}')">Eliminar</button>
          </div>
        </div>
      `).join("")}
    </section>
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
  await fetch("/api/expedientes/" + id, {
    method: "DELETE",
    headers: headers()
  });
  renderExpedientes();
}

async function renderTipos() {
  const res = await fetch("/api/tipos", { headers: headers() });
  if (res.status === 401) return logout();

  const tipos = await res.json();

  layout(`
    <h1>Tipos de procesos</h1>

    <section class="panel">
      <input id="tNombre" placeholder="Nombre del tipo de proceso">
      <textarea id="tDesc" placeholder="Descripción"></textarea>
      <button onclick="guardarTipo()">Agregar tipo</button>
    </section>

    <section class="list">
      ${tipos.map(t => `
        <div class="item">
          <div>
            <strong>${t.nombre || "Sin nombre"}</strong>
            <p>${t.descripcion || ""}</p>
          </div>
          <button class="danger" onclick="eliminarTipo('${t._id}')">Eliminar</button>
        </div>
      `).join("")}
    </section>
  `);
}

async function guardarTipo() {
  const body = {
    nombre: tNombre.value,
    descripcion: tDesc.value
  };

  const res = await fetch("/api/tipos", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body)
  });

  if (!res.ok) return alert("No se pudo guardar tipo");
  renderTipos();
}

async function eliminarTipo(id) {
  await fetch("/api/tipos/" + id, {
    method: "DELETE",
    headers: headers()
  });
  renderTipos();
}

async function renderModelos() {
  const res = await fetch("/api/modelos", { headers: headers() });
  if (res.status === 401) return logout();

  const modelos = await res.json();

  layout(`
    <h1>Modelos</h1>

    <section class="panel">
      <input id="mTitulo" placeholder="Título del modelo">
      <input id="mTipo" placeholder="Tipo">
      <textarea id="mContenido" placeholder="Contenido del modelo"></textarea>
      <button onclick="guardarModelo()">Agregar modelo</button>
    </section>

    <section class="list">
      ${modelos.map(m => `
        <div class="item">
          <div>
            <strong>${m.titulo || "Sin título"}</strong>
            <p>${m.tipo || ""}</p>
            <pre>${m.contenido || ""}</pre>
          </div>
          <button class="danger" onclick="eliminarModelo('${m._id}')">Eliminar</button>
        </div>
      `).join("")}
    </section>
  `);
}

async function guardarModelo() {
  const body = {
    titulo: mTitulo.value,
    tipo: mTipo.value,
    contenido: mContenido.value
  };

  const res = await fetch("/api/modelos", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body)
  });

  if (!res.ok) return alert("No se pudo guardar modelo");
  renderModelos();
}

async function eliminarModelo(id) {
  await fetch("/api/modelos/" + id, {
    method: "DELETE",
    headers: headers()
  });
  renderModelos();
}

if (token) {
  renderApp("dashboard");
} else {
  renderAuth();
}