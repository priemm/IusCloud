const $ = (id) => document.getElementById(id);

let clientes = [];
let expedientes = [];

const views = {
  dashboard: $("view-dashboard"),
  clientes: $("view-clientes"),
  expedientes: $("view-expedientes"),
};

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const view = btn.dataset.view;
    Object.values(views).forEach((v) => v.classList.remove("active"));
    views[view].classList.add("active");
  });
});

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Error en la petición");
  }

  return data;
}

function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

async function cargarTodo() {
  try {
    clientes = await api("/api/clientes");
    expedientes = await api("/api/expedientes");

    renderDashboard();
    renderClientes();
    renderClienteSelect();
    renderExpedientes();
  } catch (err) {
    console.error("Error cargando datos:", err);
    alert("Hubo un error cargando los datos: " + err.message);
  }
}

function renderDashboard() {
  $("stat-clientes").textContent = clientes.length;
  $("stat-expedientes").textContent = expedientes.length;

  const totalPresup = expedientes.reduce(
    (acc, e) => acc + Number(e.honorariosPresupuestados || 0),
    0
  );

  const totalCobrado = expedientes.reduce(
    (acc, e) => acc + Number(e.honorariosCobrados || 0),
    0
  );

  $("dashboard-resumen").innerHTML = `
    <div class="summary-line">Clientes cargados: <strong>${clientes.length}</strong></div>
    <div class="summary-line">Expedientes cargados: <strong>${expedientes.length}</strong></div>
    <div class="summary-line">Honorarios presupuestados: <strong>${money(totalPresup)}</strong></div>
    <div>Honorarios cobrados: <strong>${money(totalCobrado)}</strong></div>
  `;
}

function renderClientes() {
  $("lista-clientes").innerHTML = clientes.length
    ? clientes
        .map(
          (c) => `
      <div class="item">
        <div>
          <strong>${escapeHtml(c.nombre)}</strong>
          <div class="muted">${escapeHtml(c.email || "Sin email")} · ${escapeHtml(
            c.telefono || "Sin teléfono"
          )}</div>
          <div class="muted">${escapeHtml(c.dni || "")}${
            c.domicilio ? " · " + escapeHtml(c.domicilio) : ""
          }</div>
        </div>
        <button class="btn-danger" onclick="eliminarCliente('${c._id}')">Eliminar</button>
      </div>
    `
        )
        .join("")
    : `<p class="muted">No hay clientes cargados.</p>`;
}

function renderClienteSelect() {
  $("exp-cliente").innerHTML =
    `<option value="">Cliente</option>` +
    clientes
      .map((c) => `<option value="${c._id}">${escapeHtml(c.nombre)}</option>`)
      .join("");
}

function renderExpedientes() {
  $("lista-expedientes").innerHTML = expedientes.length
    ? expedientes
        .map(
          (e) => `
      <div class="item">
        <div>
          <strong>${escapeHtml(e.titulo)}</strong>
          <div class="muted">
            ${escapeHtml(e.numero || "-")} · ${escapeHtml(e.juzgado || "-")} · ${escapeHtml(
            e.clienteNombre || "-"
          )}
          </div>
          <div class="muted">
            ${escapeHtml(e.estado || "En trámite")}
            ${e.fechaVencimiento ? " · Vence: " + escapeHtml(e.fechaVencimiento) : ""}
          </div>
        </div>
        <button class="btn-danger" onclick="eliminarExpediente('${e._id}')">Eliminar</button>
      </div>
    `
        )
        .join("")
    : `<p class="muted">No hay expedientes cargados.</p>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function eliminarCliente(id) {
  const confirmar = confirm("¿Eliminar este cliente?");
  if (!confirmar) return;

  try {
    await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    await cargarTodo();
  } catch (err) {
    console.error(err);
    alert("No se pudo eliminar el cliente.");
  }
}

async function eliminarExpediente(id) {
  const confirmar = confirm("¿Eliminar este expediente?");
  if (!confirmar) return;

  try {
    await fetch(`/api/expedientes/${id}`, { method: "DELETE" });
    await cargarTodo();
  } catch (err) {
    console.error(err);
    alert("No se pudo eliminar el expediente.");
  }
}

$("btn-guardar-cliente").addEventListener("click", async () => {
  const body = {
    nombre: $("cliente-nombre").value.trim(),
    dni: $("cliente-dni").value.trim(),
    email: $("cliente-email").value.trim(),
    telefono: $("cliente-telefono").value.trim(),
    domicilio: $("cliente-domicilio").value.trim(),
    observaciones: $("cliente-observaciones").value.trim(),
  };

  if (!body.nombre) {
    alert("Ingresá el nombre del cliente.");
    return;
  }

  try {
    await api("/api/clientes", {
      method: "POST",
      body: JSON.stringify(body),
    });

    $("cliente-nombre").value = "";
    $("cliente-dni").value = "";
    $("cliente-email").value = "";
    $("cliente-telefono").value = "";
    $("cliente-domicilio").value = "";
    $("cliente-observaciones").value = "";

    await cargarTodo();
    alert("Cliente guardado correctamente.");
  } catch (err) {
    console.error("Error guardando cliente:", err);
    alert("No se pudo guardar el cliente: " + err.message);
  }
});

$("btn-guardar-expediente").addEventListener("click", async () => {
  const clienteId = $("exp-cliente").value;
  const cliente = clientes.find((c) => c._id === clienteId);

  const body = {
    titulo: $("exp-titulo").value.trim(),
    numero: $("exp-numero").value.trim(),
    juzgado: $("exp-juzgado").value.trim(),
    clienteId,
    clienteNombre: cliente?.nombre || "",
    tipoProceso: $("exp-tipo").value.trim(),
    estado: $("exp-estado").value,
    fechaVencimiento: $("exp-vencimiento").value,
    descripcion: $("exp-descripcion").value.trim(),
    honorariosPresupuestados: Number($("exp-presup").value || 0),
    honorariosCobrados: Number($("exp-cobrados").value || 0),
  };

  if (!body.titulo) {
    alert("Ingresá el título del expediente.");
    return;
  }

  try {
    await api("/api/expedientes", {
      method: "POST",
      body: JSON.stringify(body),
    });

    $("exp-titulo").value = "";
    $("exp-numero").value = "";
    $("exp-juzgado").value = "";
    $("exp-cliente").value = "";
    $("exp-tipo").value = "";
    $("exp-vencimiento").value = "";
    $("exp-descripcion").value = "";
    $("exp-presup").value = "";
    $("exp-cobrados").value = "";
    $("exp-estado").value = "En trámite";

    await cargarTodo();
    alert("Expediente guardado correctamente.");
  } catch (err) {
    console.error("Error guardando expediente:", err);
    alert("No se pudo guardar el expediente: " + err.message);
  }
});

window.eliminarCliente = eliminarCliente;
window.eliminarExpediente = eliminarExpediente;

cargarTodo();