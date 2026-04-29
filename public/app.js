const API = "";

// ================= AUTH =================

function guardarSesion(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));
}

function cerrarSesion() {
  localStorage.clear();
  location.reload();
}

function getToken() {
  return localStorage.getItem("token");
}

async function authFetch(url, options = {}) {
  const token = getToken();

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    }
  });
}

// ================= LOGIN =================

function renderLogin() {
  document.getElementById("app").innerHTML = `
    <div class="login">
      <h2>IusCloud</h2>

      <input id="nombre" placeholder="Nombre (registro)">
      <input id="email" placeholder="Email">
      <input id="password" type="password" placeholder="Contraseña">

      <button onclick="login()">Ingresar</button>
      <button onclick="register()">Crear cuenta</button>

      <hr>
      <button disabled>Ingresar con Google (próximamente)</button>
    </div>
  `;
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" }
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error);
    return;
  }

  guardarSesion(data);
  iniciarApp();
}

async function register() {
  const nombre = document.getElementById("nombre").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ nombre, email, password }),
    headers: { "Content-Type": "application/json" }
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error);
    return;
  }

  guardarSesion(data);
  iniciarApp();
}

// ================= APP =================

function iniciarApp() {
  document.getElementById("app").innerHTML = `
    <div class="layout">
      <div class="sidebar">
        <h3>IusCloud</h3>
        <button onclick="renderDashboard()">Dashboard</button>
        <button onclick="renderClientes()">Clientes</button>
        <button onclick="renderExpedientes()">Expedientes</button>
        <button onclick="renderTipos()">Tipos de procesos</button>
        <button onclick="renderModelos()">Modelos</button>
        <hr>
        <button onclick="cerrarSesion()">Cerrar sesión</button>
      </div>

      <div class="main" id="contenido"></div>
    </div>
  `;

  renderDashboard();
}

// ================= DASHBOARD =================

async function renderDashboard() {
  const res = await authFetch("/api/dashboard");
  const data = await res.json();

  document.getElementById("contenido").innerHTML = `
    <h2>Dashboard</h2>
    <div class="cards">
      <div>Clientes: ${data.clientes}</div>
      <div>Expedientes: ${data.expedientes}</div>
      <div>Tipos: ${data.tipos}</div>
      <div>Modelos: ${data.modelos}</div>
    </div>
  `;
}

// ================= CLIENTES =================

async function renderClientes() {
  document.getElementById("contenido").innerHTML = `
    <h2>Clientes</h2>

    <input id="buscar" placeholder="Buscar..." oninput="cargarClientes()">

    <input id="nombre" placeholder="Nombre">
    <input id="email" placeholder="Email">
    <button onclick="crearCliente()">Agregar</button>

    <div id="lista"></div>
  `;

  cargarClientes();
}

async function cargarClientes() {
  const q = document.getElementById("buscar")?.value || "";
  const res = await authFetch("/api/clientes?q=" + q);
  const data = await res.json();

  document.getElementById("lista").innerHTML = data.map(c => `
    <div class="item">
      ${c.nombre} - ${c.email}
      <button onclick="eliminarCliente('${c._id}')">X</button>
    </div>
  `).join("");
}

async function crearCliente() {
  const nombre = document.getElementById("nombre").value;
  const email = document.getElementById("email").value;

  await authFetch("/api/clientes", {
    method: "POST",
    body: JSON.stringify({ nombre, email })
  });

  cargarClientes();
}

async function eliminarCliente(id) {
  await authFetch("/api/clientes/" + id, { method: "DELETE" });
  cargarClientes();
}

// ================= EXPEDIENTES =================

async function renderExpedientes() {
  const res = await authFetch("/api/expedientes");
  const data = await res.json();

  document.getElementById("contenido").innerHTML = `
    <h2>Expedientes</h2>

    ${data.map(e => `
      <div class="item">
        ${e.titulo || "Sin título"}
        ${e.vencimiento ? `
          <a target="_blank"
          href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${e.titulo}&dates=${formatearFecha(e.vencimiento)}/${formatearFecha(e.vencimiento)}">
          📅
          </a>
        ` : ""}
      </div>
    `).join("")}
  `;
}

function formatearFecha(fecha) {
  return fecha.replace(/-|:/g, "").slice(0,15);
}

// ================= TIPOS =================

async function renderTipos() {
  const res = await authFetch("/api/tipos");
  const data = await res.json();

  document.getElementById("contenido").innerHTML = `
    <h2>Tipos de procesos</h2>
    ${data.map(t => <div>${t.nombre}</div>).join("")}
  `;
}

// ================= MODELOS =================

async function renderModelos() {
  const res = await authFetch("/api/modelos");
  const data = await res.json();

  document.getElementById("contenido").innerHTML = `
    <h2>Modelos</h2>
    ${data.map(m => <div>${m.titulo}</div>).join("")}
  `;
}

// ================= INIT =================

if (getToken()) {
  iniciarApp();
} else {
  renderLogin();
}