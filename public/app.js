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
    </div>
  `;
}

async function login() {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error login");
      return;
    }

    guardarSesion(data);
    iniciarApp();
  } catch (e) {
    alert("Error conexión");
  }
}

async function register() {
  try {
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
      alert(data.error || "Error registro");
      return;
    }

    guardarSesion(data);
    iniciarApp();
  } catch (e) {
    alert("Error conexión");
  }
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
        <button onclick="renderTipos()">Tipos</button>
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
  try {
    const res = await authFetch("/api/dashboard");
    const data = await res.json();

    document.getElementById("contenido").innerHTML = `
      <h2>Dashboard</h2>
      <div>Clientes: ${data.clientes || 0}</div>
      <div>Expedientes: ${data.expedientes || 0}</div>
      <div>Tipos: ${data.tipos || 0}</div>
      <div>Modelos: ${data.modelos || 0}</div>
    `;
  } catch {
    document.getElementById("contenido").innerHTML = <p>Error cargando dashboard</p>;
  }
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
  try {
    const q = document.getElementById("buscar")?.value || "";
    const res = await authFetch("/api/clientes?q=" + q);
    const data = await res.json();

    document.getElementById("lista").innerHTML = data.map(c => `
      <div class="item">
        ${c.nombre || "-"} - ${c.email || "-"}
        <button onclick="eliminarCliente('${c._id}')">X</button>
      </div>
    `).join("");
  } catch {
    document.getElementById("lista").innerHTML = "Error cargando clientes";
  }
}

async function crearCliente() {
  try {
    const nombre = document.getElementById("nombre").value;
    const email = document.getElementById("email").value;

    await authFetch("/api/clientes", {
      method: "POST",
      body: JSON.stringify({ nombre, email })
    });

    cargarClientes();
  } catch {
    alert("Error creando cliente");
  }
}

async function eliminarCliente(id) {
  try {
    await authFetch("/api/clientes/" + id, {
      method: "DELETE"
    });

    cargarClientes();
  } catch {
    alert("Error eliminando");
  }
}

// ================= EXPEDIENTES =================

async function renderExpedientes() {
  try {
    const res = await authFetch("/api/expedientes");
    const data = await res.json();

    document.getElementById("contenido").innerHTML = `
      <h2>Expedientes</h2>

      ${data.map(e => `
        <div class="item">
          ${e.titulo || "Sin título"}
        </div>
      `).join("")}
    `;
  } catch {
    document.getElementById("contenido").innerHTML = "Error expedientes";
  }
}

// ================= TIPOS =================

async function renderTipos() {
  try {
    const res = await authFetch("/api/tipos");
    const data = await res.json();

    document.getElementById("contenido").innerHTML = `
      <h2>Tipos</h2>
      ${data.map(t => <div>${t.nombre}</div>).join("")}
    `;
  } catch {
    document.getElementById("contenido").innerHTML = "Error tipos";
  }
}

// ================= MODELOS =================

async function renderModelos() {
  try {
    const res = await authFetch("/api/modelos");
    const data = await res.json();

    document.getElementById("contenido").innerHTML = `
      <h2>Modelos</h2>
      ${data.map(m => <div>${m.titulo}</div>).join("")}
    `;
  } catch {
    document.getElementById("contenido").innerHTML = "Error modelos";
  }
}

// ================= INIT =================

if (getToken()) {
  iniciarApp();
} else {
  renderLogin();
}