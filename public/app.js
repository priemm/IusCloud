const app = document.getElementById("app");

let token = localStorage.getItem("token");
let usuario = JSON.parse(localStorage.getItem("usuario") || "null");

const PJN_URL = "https://www.pjn.gov.ar/";
const MEV_URL = "https://mev.scba.gov.ar/";

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

function copyText(text) {
  navigator.clipboard.writeText(text || "");
  alert("Copiado");
}

function calendarLink(item) {
  const title = encodeURIComponent(item.titulo || item.tarea || "Vencimiento");
  const details = encodeURIComponent(item.descripcion || "");
  const date = item.vencimiento ? item.vencimiento.replaceAll("-", "") : "";
  return https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details};
}

function renderAuth() {
  app.innerHTML = `
    <div class="auth">
      <div class="auth-card">
        <h1>IusCloud</h1>
        <p>Tu estudio jurídico digital</p>

        <input id="authNombre" placeholder="Nombre / Estudio">
        <input id="authEmail" placeholder="Email">
        <input id="authPassword" type="password" placeholder="Contraseña">

        <button onclick="register()">Crear cuenta</button>
        <button onclick="login()">Ingresar</button>
        <button onclick="alert('Google Login se configura después con Google Cloud OAuth')">Ingresar con Google</button>
      </div>
    </div>
  `;
}

async function register() {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: authNombre.value,
      email: authEmail.value,
      password: authPassword.value,
      estudio: authNombre.value
    })
  });

  const data = await res.json();
  if (!res.ok) return alert(data.error || "Error al registrar");

  saveSession(data);
  renderDashboard();
}

async function login() {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: authEmail.value,
      password: authPassword.value
    })
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
        <button onclick="renderAgenda()">Agenda</button>
        <button onclick="renderTipos()">Tipos de procesos</button>
        <button onclick="renderModelos()">Modelos</button>
        <button onclick="logout()">Cerrar sesión</button>
      </aside>

      <main class="main">${content}</main>
    </div>
  `;
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: options.headers || headers()
  });

  if (res.status === 401) {
    logout();
    return null;
  }

  return res.json();
}

async function renderDashboard() {
  const d = await api("/api/dashboard");
  if (!d) return;

  layout(`
    <h1>Dashboard</h1>

    <div class="cards">
      <div class="card"><span>Clientes</span><strong>${d.clientes || 0}</strong></div>
      <div class="card"><span>Expedientes</span><strong>${d.expedientes || 0}</strong></div>
      <div class="card"><span>Tipos</span><strong>${d.tipos || 0}</strong></div>
      <div class="card"><span>Modelos</span><strong>${d.modelos || 0}</strong></div>
    </div>

    <div class="panel">
      <h2>Alertas de vencimientos</h2>
      ${(d.alertas || []).length ? d.alertas.map(a => `
        <div class="item">
          <div>
            <strong>${a.tipo}</strong>
            <p>${a.titulo} · ${a.fecha}</p>
          </div>
        </div>
      `).join("") : "<p>Sin alertas por ahora.</p>"}
    </div>
  `);
}

async function renderClientes(q = "") {
  const clientes = await api("/api/clientes?q=" + encodeURIComponent(q));
  if (!clientes) return;

  layout(`
    <h1>Clientes</h1>

    <input class="search" placeholder="Buscar cliente..." oninput="renderClientes(this.value)">

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
  await api("/api/clientes", {
    method: "POST",
    body: JSON.stringify({
      nombre: cNombre.value,
      dni: cDni.value,
      email: cEmail.value,
      telefono: cTelefono.value,
      domicilio: cDomicilio.value,
      observaciones: cObs.value
    })
  });
  renderClientes();
}

async function eliminarCliente(id) {
  await api("/api/clientes/" + id, { method: "DELETE" });
  renderClientes();
}

async function renderExpedientes(q = "") {
  const clientes = await api("/api/clientes");
  const exps = await api("/api/expedientes?q=" + encodeURIComponent(q));
  const tipos = await api("/api/tipos");
  if (!clientes || !exps) return;

  layout(`
    <h1>Expedientes</h1>

    <input class="search" placeholder="Buscar expediente..." oninput="renderExpedientes(this.value)">

    <div class="form">
      <input id="eTitulo" placeholder="Carátula / Título">
      <input id="eNumero" placeholder="Número">
      <input id="eJuzgado" placeholder="Juzgado">

      <select id="eCliente">
        <option value="">Cliente</option>
        ${clientes.map(c => <option value="${c.nombre || ""}">${c.nombre || "Sin nombre"}</option>).join("")}
      </select>

      <select id="eTipo">
        <option value="">Tipo de proceso</option>
        ${(tipos || []).map(t => <option value="${t.nombre}">${t.nombre}</option>).join("")}
      </select>

      <select id="eJurisdiccion">
        <option value="">Jurisdicción</option>
        <option value="PJN">Capital Federal / PJN</option>
        <option value="MEV">Provincia / MEV</option>
      </select>

      <select id="eEstado">
        <option value="Activo">Activo</option>
        <option value="Pendiente">Pendiente</option>
        <option value="Urgente">Urgente</option>
        <option value="Finalizado">Finalizado</option>
      </select>

      <input id="eVencimiento" type="date">
      <textarea id="eDesc" placeholder="Descripción"></textarea>

      <button onclick="guardarExpediente()">Agregar expediente</button>
    </div>

    <div class="list">
      ${exps.map(e => `
        <div class="item">
          <div>
            <strong>${e.titulo || "Sin título"}</strong>
            <p>${e.numero || ""} · ${e.juzgado || ""} · ${e.cliente || ""}</p>
            <p>${e.estado || ""} · ${e.jurisdiccion || ""} · Vence: ${e.vencimiento || "Sin fecha"}</p>
          </div>
          <div>
            <button onclick="renderFichaExpediente('${e._id}')">Abrir ficha</button>
            <button onclick="eliminarExpediente('${e._id}')">Eliminar</button>
          </div>
        </div>
      `).join("")}
    </div>
  `);
}

async function guardarExpediente() {
  await api("/api/expedientes", {
    method: "POST",
    body: JSON.stringify({
      titulo: eTitulo.value,
      numero: eNumero.value,
      juzgado: eJuzgado.value,
      cliente: eCliente.value,
      tipo: eTipo.value,
      jurisdiccion: eJurisdiccion.value,
      estado: eEstado.value,
      vencimiento: eVencimiento.value,
      descripcion: eDesc.value
    })
  });
  renderExpedientes();
}

async function eliminarExpediente(id) {
  await api("/api/expedientes/" + id, { method: "DELETE" });
  renderExpedientes();
}

async function renderFichaExpediente(id) {
  const e = await api("/api/expedientes/" + id);
  const modelos = await api("/api/modelos");
  if (!e) return;

  const saldo = (e.movimientos || []).reduce((acc, m) => {
    return m.tipo === "Cobro" ? acc + Number(m.monto || 0) : acc - Number(m.monto || 0);
  }, 0);

  layout(`
    <button onclick="renderExpedientes()">← Volver</button>
    <h1>${e.titulo || "Expediente"}</h1>

    <div class="panel">
      <p><strong>Número:</strong> ${e.numero || "-"}</p>
      <p><strong>Juzgado:</strong> ${e.juzgado || "-"}</p>
      <p><strong>Cliente:</strong> ${e.cliente || "-"}</p>
      <p><strong>Jurisdicción:</strong> ${e.jurisdiccion || "-"}</p>
      <p><strong>Estado:</strong> ${e.estado || "-"}</p>

      <button onclick="copyText('${e.numero || ""}')">Copiar número</button>
      ${e.jurisdiccion === "PJN" ? <a target="_blank" href="${PJN_URL}">Abrir PJN</a> : ""}
      ${e.jurisdiccion === "MEV" ? <a target="_blank" href="${MEV_URL}">Abrir MEV</a> : ""}
      ${e.vencimiento ? <a target="_blank" href="${calendarLink(e)}">Google Calendar</a> : ""}
    </div>

    <div class="panel">
      <h2>Nueva tarea</h2>
      <div class="form">
        <input id="tTitulo" placeholder="Título de tarea">
        <input id="tVencimiento" type="date">
        <select id="tEstado">
          <option>Pendiente</option>
          <option>Realizada</option>
        </select>
        <input id="tArchivo" placeholder="Link PDF / archivo">
        <textarea id="tDescripcion" placeholder="Descripción"></textarea>
        <button onclick="guardarTarea('${e._id}')">Agregar tarea</button>
      </div>
    </div>

    <div class="panel">
      <h2>Tareas</h2>
      ${(e.tareas || []).map(t => `
        <div class="item">
          <div>
            <strong>${t.titulo}</strong>
            <p>${t.estado} · Vence: ${t.vencimiento || "-"}</p>
            <p>${t.descripcion || ""}</p>
            ${t.archivoUrl ? <a target="_blank" href="${t.archivoUrl}">Ver archivo</a> : ""}
          </div>
          <div>
            ${t.vencimiento ? <a target="_blank" href="${calendarLink(t)}">Google Calendar</a> : ""}
            <button onclick="actualizarTarea('${e._id}', '${t._id}', '${t.estado === "Realizada" ? "Pendiente" : "Realizada"}')">
              Marcar ${t.estado === "Realizada" ? "pendiente" : "realizada"}
            </button>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="panel">
      <h2>Contabilidad</h2>
      <p><strong>Saldo:</strong> $${saldo}</p>

      <div class="form">
        <select id="mTipo">
          <option>Cobro</option>
          <option>Pago</option>
        </select>
        <input id="mMonto" type="number" placeholder="Monto">
        <input id="mFecha" type="date">
        <input id="mConcepto" placeholder="Concepto">
        <button onclick="guardarMovimiento('${e._id}')">Agregar movimiento</button>
      </div>

      ${(e.movimientos || []).map(m => `
        <div class="item">
          <div>
            <strong>${m.tipo}: $${m.monto}</strong>
            <p>${m.fecha || ""} · ${m.concepto || ""}</p>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="panel">
      <h2>Generador con modelos</h2>
      <select id="modeloSelect">
        <option value="">Elegir modelo</option>
        ${(modelos || []).map(m => <option value="${m._id}">${m.titulo}</option>).join("")}
      </select>
      <button onclick="generarModelo('${e._id}')">Generar texto</button>
      <textarea id="textoGenerado" placeholder="Texto generado editable"></textarea>
    </div>

    <div class="panel">
      <h2>Historial</h2>
      ${(e.historial || []).map(h => `
        <div class="item">
          <div>
            <strong>${h.tipo}</strong>
            <p>${new Date(h.fecha).toLocaleString()} · ${h.detalle}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `);
}

async function guardarTarea(id) {
  await api(/api/expedientes/${id}/tareas, {
    method: "POST",
    body: JSON.stringify({
      titulo: tTitulo.value,
      vencimiento: tVencimiento.value,
      estado: tEstado.value,
      archivoUrl: tArchivo.value,
      descripcion: tDescripcion.value
    })
  });
  renderFichaExpediente(id);
}

async function actualizarTarea(expId, tareaId, estado) {
  await api(/api/expedientes/${expId}/tareas/${tareaId}, {
    method: "PATCH",
    body: JSON.stringify({ estado })
  });
  renderFichaExpediente(expId);
}

async function guardarMovimiento(id) {
  await api(/api/expedientes/${id}/contabilidad, {
    method: "POST",
    body: JSON.stringify({
      tipo: mTipo.value,
      monto: mMonto.value,
      fecha: mFecha.value,
      concepto: mConcepto.value
    })
  });
  renderFichaExpediente(id);
}

async function generarModelo(expId) {
  const e = await api("/api/expedientes/" + expId);
  const modelos = await api("/api/modelos");
  const modelo = modelos.find(m => m._id === modeloSelect.value);
  if (!modelo) return;

  let texto = modelo.contenido || "";
  texto = texto.replaceAll("{{cliente}}", e.cliente || "");
  texto = texto.replaceAll("{{expediente}}", e.titulo || "");
  texto = texto.replaceAll("{{numero}}", e.numero || "");
  texto = texto.replaceAll("{{juzgado}}", e.juzgado || "");
  textoGenerado.value = texto;
}

async function renderAgenda() {
  const exps = await api("/api/expedientes");
  if (!exps) return;

  const eventos = [];

  exps.forEach(e => {
    if (e.vencimiento) eventos.push({ titulo: e.titulo, fecha: e.vencimiento, tipo: "Expediente" });

    (e.tareas || []).forEach(t => {
      if (t.vencimiento) eventos.push({ titulo: ${e.titulo} - ${t.titulo}, fecha: t.vencimiento, tipo: "Tarea" });
    });
  });

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  layout(`
    <h1>Agenda</h1>
    <div class="list">
      ${eventos.map(ev => `
        <div class="item">
          <div>
            <strong>${ev.fecha}</strong>
            <p>${ev.tipo}: ${ev.titulo}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `);
}

async function renderTipos() {
  const tipos = await api("/api/tipos");
  if (!tipos) return;

  layout(`
    <h1>Tipos de procesos</h1>

    <div class="form">
      <input id="tpNombre" placeholder="Nombre">
      <textarea id="tpDesc" placeholder="Descripción"></textarea>
      <button onclick="guardarTipo()">Agregar tipo</button>
    </div>

    <div class="list">
      ${tipos.map(t => `
        <div class="item">
          <div>
            <strong>${t.nombre}</strong>
            <p>${t.descripcion || ""}</p>
          </div>
          <button onclick="eliminarTipo('${t._id}')">Eliminar</button>
        </div>
      `).join("")}
    </div>
  `);
}

async function guardarTipo() {
  await api("/api/tipos", {
    method: "POST",
    body: JSON.stringify({ nombre: tpNombre.value, descripcion: tpDesc.value })
  });
  renderTipos();
}

async function eliminarTipo(id) {
  await api("/api/tipos/" + id, { method: "DELETE" });
  renderTipos();
}

async function renderModelos() {
  const modelos = await api("/api/modelos");
  if (!modelos) return;

  layout(`
    <h1>Modelos</h1>

    <div class="form">
      <input id="moTitulo" placeholder="Título">
      <input id="moTipo" placeholder="Tipo">
      <textarea id="moContenido" placeholder="Contenido. Variables: {{cliente}}, {{expediente}}, {{numero}}, {{juzgado}}"></textarea>
      <button onclick="guardarModelo()">Agregar modelo</button>
    </div>

    <div class="list">
      ${modelos.map(m => `
        <div class="item">
          <div>
            <strong>${m.titulo}</strong>
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
  await api("/api/modelos", {
    method: "POST",
    body: JSON.stringify({ titulo: moTitulo.value, tipo: moTipo.value, contenido: moContenido.value })
  });
  renderModelos();
}

async function eliminarModelo(id) {
  await api("/api/modelos/" + id, { method: "DELETE" });
  renderModelos();
}

if (token) renderDashboard();
else renderAuth();