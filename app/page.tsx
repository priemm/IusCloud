"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { jsPDF } from "jspdf";

type Vista =
| "dashboard"
| "clientes"
| "expedientes"
| "agenda"
| "tipos"
| "modelos";

type EstadoExpediente =
| "En trámite"
| "Pendiente"
| "Urgente"
| "Archivado"
| "Finalizado";

type TipoMovimiento = "tarea" | "vencimiento" | "nota";
type EstadoMovimiento = "pendiente" | "hecho";
type NivelAlerta = "ok" | "proximo" | "urgente" | "vencido";

type Cliente = {
id: number;
nombre: string;
telefono: string;
email: string;
documento: string;
domicilio: string;
observaciones: string;
};

type Movimiento = {
texto: string;
tipo: TipoMovimiento;
fecha: string;
estado: EstadoMovimiento;
};

type Expediente = {
id: number;
titulo: string;
numero: string;
juzgado: string;
cliente: string;
clienteId?: number;
tipoProceso: string;
estadoExpediente: EstadoExpediente;
vencimiento?: string;
movimientos: Movimiento[];
honorariosPresupuestados: number;
honorariosCobrados: number;
};

type ModeloEscrito = {
id: number;
nombre: string;
categoria: string;
contenido: string;
};

type AgendaItem = {
fecha: string;
tipo: TipoMovimiento | "vencimiento";
texto: string;
expedienteId: number;
expedienteTitulo: string;
cliente: string;
};

const CLIENTE_VACIO: Omit<Cliente, "id"> = {
nombre: "",
telefono: "",
email: "",
documento: "",
domicilio: "",
observaciones: "",
};

const TIPOS_DEFAULT = [
"Daños y perjuicios",
"Cobro ejecutivo",
"Cobro de pesos",
"Sucesión",
"Divorcio",
"Alimentos",
"Despido",
"Accidente de trabajo",
"Amparo",
"Penal",
"Laboral",
"Previsional",
];

const ESTADOS: EstadoExpediente[] = [
"En trámite",
"Pendiente",
"Urgente",
"Archivado",
"Finalizado",
];

const MODELOS_DEFAULT: ModeloEscrito[] = [
{
id: 1,
nombre: "Presentación simple",
categoria: "General",
contenido:
'<p>Se presenta <strong>{{cliente_nombre}}</strong>, DNI {{cliente_documento}}, con domicilio en {{cliente_domicilio}}, en los autos caratulados "<strong>{{expediente_titulo}}</strong>", Expte. N° {{expediente_numero}}, que tramitan por ante {{expediente_juzgado}}.</p><p>Tipo de proceso: {{expediente_tipo_proceso}}.<br/>Estado del expediente: {{expediente_estado}}.</p><p>Proveer de conformidad,<br/><strong>SERÁ JUSTICIA.</strong></p><p>Fecha: {{fecha_hoy}}</p>',
},
{
id: 2,
nombre: "Pronto despacho",
categoria: "Impulsos",
contenido:
'<p>En los autos "<strong>{{expediente_titulo}}</strong>", Expte. N° {{expediente_numero}}, que tramitan por ante {{expediente_juzgado}}, vengo a solicitar se imprima pronto despacho.</p><p>Cliente: {{cliente_nombre}}<br/>Tipo de proceso: {{expediente_tipo_proceso}}</p><p>Fecha: {{fecha_hoy}}</p>',
},
];

function formatCurrency(value: number) {
return new Intl.NumberFormat("es-AR", {
style: "currency",
currency: "ARS",
maximumFractionDigits: 0,
}).format(Number(value || 0));
}

function htmlToText(html: string) {
if (typeof window === "undefined") return html;
const div = document.createElement("div");
div.innerHTML = html;
return div.innerText;
}

function textoAlerta(alerta: NivelAlerta) {
if (alerta === "vencido") return "Vencido";
if (alerta === "urgente") return "Urgente";
if (alerta === "proximo") return "Próximo a vencer";
return "OK";
}

function colorEvento(tipo: string) {
if (tipo === "vencimiento") return "#dc2626";
if (tipo === "tarea") return "#d97706";
return "#2563eb";
}

function badgeEstado(estado: EstadoExpediente): CSSProperties {
const colores: Record<EstadoExpediente, { fondo: string; texto: string }> = {
"En trámite": { fondo: "#dbeafe", texto: "#1d4ed8" },
Pendiente: { fondo: "#fef3c7", texto:"#92400e" },
Urgente: { fondo: "#fee2e2", texto: "#b91c1c" },
Archivado: { fondo: "#e5e7eb", texto: "#374151" },
Finalizado: { fondo: "#dcfce7", texto: "#166534" },
};

return {
display: "inline-block",
padding: "6px 10px",
borderRadius: 999,
tamaño de fuente: 12,
peso de fuente: 700,
fondo: colores[estado].fondo,
color: colores[estado].texto,
};
}

function insigniaAlerta(alerta: NivelAlerta): CSSProperties {
const mapa: Record<NivelAlerta, { fondo: string; texto: string }> = {
ok: { fondo: "#e5e7eb", texto: "#374151" },
próximo: { fondo: "#fef3c7", texto: "#92400e" },
urgente: { fondo: "#ffedd5", texto: "#c2410c" },
vencido: { fondo: "#fee2e2", texto: "#b91c1c" },
};

return {
display: "inline-block",
padding: "6px 10px",
borderRadius: 999,
fontSize: 12,
fontWeight: 700,
background: map[alert].fondo,
color: map[alert].text,
};
}

function SidebarButton({
active,
children,
onClick,
}: {
active: boolean;
children: React.ReactNode;
onClick: () => void;
}) {
return (
<button
onClick={onClick}
style={{
width: "100%",
textAlign: "left",
padding: "12px 14px",
borderRadius: 12,
border: "none",
marginBottom: 8,
background: active ? "#1e293b" : "transparent",
color: active ? "white" : "#cbd5e1",
cursor: "pointer",
fontWeight: 700,
}}
>
{children}
</button>
);
}

function StatCard({
title,
value,
}: {
title: string;
value: string | number;
}) {
return (
<div style={styles.cardMini}>
<div style={styles.labelMini}>{ title}</div>
<div style={styles.numberMini}>{ value}</div>
</div>
);
}

export default function Home() {
const [view, setView] = useState<View>("dashboard");

const [clients, setClientes] = useState<Cliente[]>([]);
const [nuevoCliente, setNuevoCliente] = useState(CLIENTE_VACIO);
const [clienteBusque, setClienteBusque] = useState("");
const [CustomerSelected, setCustomerSelected] =
useState<Customer | null>(null);

const [processTypes,setTiposProceso] = useState<string[]>(TIPOS_ DEFAULT);
const [nuevoTipoProceso, setNuevoTipoProceso] = useState("");

const [expedientes, setExpedientes] = useState<Expediente[]>([]);
const [expSeleccionado, setExpSeleccionado] = useState<Expediente | null>(
null
);
const [tituloExp, setTituloExp] = useState("");
const [numeroExp, setNumeroExp] = useState("");
const [juzgadoExp, setJuzgadoExp] = useState("");
const [clienteExpedienteId, setClienteExpedienteId] = useState("");
const [tipoProcesoExp, setTipoProcesoExp] = useState(TIPOS_DEFAULT[0]);
const [estadoExp, setEstadoExp] =
useState<EstadoExpediente>("En trámite");
const [vencimientoExp, setVencimientoExp] = useState("");
const [honorariosPres, setHonorariosPres] = useState("");
const [honorariosCob, setHonorariosCob] = useState("");
const [busquedaExpediente, setBusquedaExpediente] = useState("");

const [textoMov, setTextoMov] = useState("");
const [tipoMov, setTipoMov] = useState<TipoMovimiento>("tarea");
const [fechaMov, setFechaMov] = useState("");

const [modelos, setModelos] = useState<ModeloEscrito[]>(MODELOS_DEFAULT);
const [nuevoModeloNombre, setNuevoModeloNombre] = useState("");
const [nuevoModeloCategoria, setNuevoModeloCategoria] = useState("");
const [nuevoModeloContenido, setNuevoModeloContenido] = useState("");
const [modeloSeleccionado, setModeloSeleccionado] =
useState<ModeloEscrito | null>(null);

const [modeloGeneradorId, setModeloGeneradorId] = useState("");
const [textoGenerado, setTextoGenerado] = useState("");
const editorRef = useRef<HTMLDivElement | null>(null);

const [mesActual, setMesActual] = useState(new Date().getMonth());
const [anioActual, setAnioActual] = useState(new Date().getFullYear());
const [fechaSeleccionada, setFechaSeleccionada] = useState("");

useEffect(() => {
const rawClientes = localStorage.getItem("iuscloud_clientes");
const rawExpedientes = localStorage.getItem("iuscloud_expedientes");
const rawTipos = localStorage.getItem("iuscloud_tipos");
const rawModelos = localStorage.getItem("iuscloud_modelos");

if (rawClientes) setClientes(JSON.parse(rawClientes));
if (rawExpedientes) setExpedientes(JSON.parse(rawExpedientes));

if (rawTipos) {
const parsed = JSON.parse(rawTipos);
if (Array.isArray(parsed) && parsed.length > 0) { } } setTipoProcesoExp(parsed[0]);
setTiposProceso(parsed);




if (rawModelos) {
const analizado = JSON.parse(rawModelos);
if (Array.isArray(analizado) && parsed.length > 0) {
setModelos(analizado);
}
}
}, []);

useEffect(() => {
localStorage.setItem(" iuscloud_clientes", JSON.stringify(clientes));
}, [clientes]);

useEffect(() => {
localStorage.setItem(" iuscloud_expedientes", JSON.stringify(expedientes));
}, [expedientes]);

useEffect(() => {
localStorage.setItem(" iuscloud_tipos", JSON.stringify(tiposProceso));
}, [tiposProceso]);

useEffect(() => {
localStorage.setItem(" iuscloud_modelos", JSON.stringify(modelos));
}, [modelos]);

useEffect(() => {
if (editorRef.current && editorRef.current.innerHTML !== textoGenerado) { editorRef.current.innerHTML
= textoGenerado;
}
}, [textoGenerado]);

const irAVista = (nuevaVista: Vista) => {
setVista(nuevaVista);
setClienteSeleccionado(null);
setExpSeleccionado(null);
setModeloSeleccionado(null);
setModeloGeneradorId("");
setTextoGenerado("");
setFechaSeleccionada("");
};

const obtenerAlerta = (exp: Expediente): NivelAlerta => {
const today = new Date().toISOString().slice(0, 10);

if (!exp.expiration) return "ok";
if (expiration date < today) return "expired";

const urg = new Date();
urg.setDate(urg.getDate() + 3);

const prox = new Date();
prox.setDate(prox.getDate() + 7);

const urgStr = urg.toISOString().slice(0, 10);
const proxStr = prox.toISOString().slice(0, 10);

if (expiry date <= urgStr) return "urgent";
if (exp.expiration <= nextStr) return "next";

return "ok";
};

const priority = (exp: Expediente) => {
const alert = obtenerAlerta(exp);
if (alert === "expired") return 0;
if (alert === "urgent") return 1;
if (alert === "next") return 2;
return 3;
};

const aggregateCliente = () => {
if (!nuevoCliente.nombre.trim()) return;

setClientes((prev) => [
{
id: Fecha.ahora(),
nombre: nuevoCliente.nombre.trim(),
teléfono: nuevoCliente.telefono.trim(),
email: nuevoCliente.email.trim(),
documento: nuevoCliente.documento.trim(),
domicilio: nuevoCliente.domicilio.trim(),
observaciones: nuevoCliente.observaciones.trim(),
},
...prev,
]);

setNuevoCliente(CLIENTE_VACIO);
};

const guardarClienteSeleccionado = () => {
if (!clienteSeleccionado) return;

setClientes((prev) =>
prev.map((c) =>
c.id === clienteSeleccionado.id ? clienteSeleccionado : c
)
);

setExpedientes((prev) =>
prev.map((e) =>
e.clienteId === clienteSeleccionado.id
? { ...e, cliente: clienteSeleccionado.nombre }
: e
)
);
};

const agregarTipoProceso = () => {
const valor = nuevoTipoProceso.trim();
if (!valor) return;

if (tiposProceso.some((t) => t.toLowerCase() === valor.toLowerCase())) {
return;
}

setTiposProceso((prev) => [...prev, valor]);
setNuevoTipoProceso("");
};

const eliminarTipoProceso = (tipo: string) => {
if (tiposProceso.length <= 1) return;

if (expedientes.some((e) => e.tipoProceso === tipo)) {
alert("No podés eliminar este tipo porque está en uso.");
return;
}

setTiposProceso((prev) => prev.filter((t) => t !== tipo));
};

const crearExpediente = () => {
if (!tituloExp.trim() || !clienteExpedienteId) return;

const cliente = clientes.find((c) => String(c.id) === clienteExpedienteId);
if (!cliente) return;

const nuevo: Expediente = {
id: Date.now(),
titulo: tituloExp.trim(),
numero: numeroExp.trim(),
juzgado: juzgadoExp.trim(),
cliente: cliente.nombre,
clienteId: cliente.id,
tipoProceso: tipoProcesoExp,
estadoExpediente: estadoExp,
vencimiento: vencimientoExp,
movimientos: [],
honorariosPresupuestados: Number(honorariosPres || 0),
honorariosCobrados: Number(honorariosCob || 0),
};

setExpedientes((prev) => [nuevo, ...anterior]); setFenorariosPres(""); setVencimientoExp(""); setEstadoExp("En trámite");tiposProceso[0] || ""); setTipoProcesoExp( setClienteExpedienteId(""); setJuzgadoExp(""); setNumeroExp("");

setTituloExp("");







setHonorariosCob("");
};

const atualizaExpedienteEstado = (estado: Expediente Estado) => {
if (!expSelecionado) return;

const atualizados = expedientes.map((e) =>
e.id === expSelecionado.id ? { ...e, estadoExpediente: estado } : e
);

setExpedientes(atualizados);
setExpSelecionado(
atualizados.find((e) => e.id === expSelecionado.id) ?? null
);
};

const agregarMovimiento = () => {
if (!expSelecionado || !textoMov.trim() || !fechaMov) return;

const nuevo: Movimiento = {
texto: textoMov.trim(),
tipo: tipoMov,
fecha: fechaMov,
estado: "pendiente",
};

const updated = documents.map((e) =>
e.id === selectedExp.id
? { ...e, movements: [...e.movements, new] }
: e
);

setDocuments(updated);
setSelectedExp.id(
updated.find((e) => e.id === selectedExp.id) ?? null
);

setTextMovement("");
setMovementType("task");
setCloseMovement("");
};

const toggleMovementState = (index: number) => {
if (!selectedExp.id) return;

const updated = expedientes.map((e) => {
if ( e.id !== expSelected.id) return e;

return {
...e,
movements: e.movimientos.map((m, i) =>
i === index
? {
...m,
state: m.state === "pendiente" ? "hecho" : "pendiente",
}
: m
),
};
});

setExpedientes(updated);
setSelectedExp(
updated.find((e) => e.id ===Selectedexp.id) ?? null
);
};

const addModel = () => {
if (!nuevoModeloNombre.trim() || !nuevoModeloContenido.trim()) return;

setModelos((prev) => [
{
id: Date.now(),
name: newModeloNombre.trim(),
category: newModeloCategoria.trim() || "General",
content: newModeloContenido,
},
...prev,
]);

setNuevoModeloNombre("");
setNuevoModeloCategoria("");
setNuevoModeloContenido("");
};

const guardarModeloSeleccionado = () => {
if (!modeloSeleccionado) return;

setModelos((prev) =>
prev.map((m) =>
m.id === modeloSeleccionado.id ? modeloSeleccionado : m
)
);
};

const eliminarModelo = (id: number) => {
setModelos((prev) => prev.filter((m) => m.id !== id));
if (modeloSeleccionado?.id === id) {
setModeloSeleccionado(null);
}
};

const reemplazarVariables = (contenido: string, exp: Expediente) => {
const cliente = clientes.find((c) => c.id === exp.clienteId);

const variables: Record<string, string> = {
cliente_nombre: cliente?.nombre ?? exp.cliente ?? "",
cliente_telefono: cliente?.telefono ?? "",
cliente_email: cliente?.email ?? "",
cliente_documento: cliente?.documento ?? "",
cliente_domicilio: cliente?.domicilio ?? "",
expediente_titulo: exp.titulo ?? "",
expediente_numero: exp.numero ?? "",
expediente_juzgado: exp.juzgado ?? "",
expediente_tipo_proceso: exp.tipoProceso ?? "",
expediente_estado: exp.estadoExpediente ?? "",
expediente_vencimiento: exp.vencimiento ?? "",
fecha_hoy: new Date().toLocaleDateString("es-AR"),
};

let texto = contenido;

Object.entries(variables).forEach(([clave, valor]) => {
texto = texto.split(`{{${clave}}}`).join(valor);
});

return texto;
};

const generarTextoDesdeModelo = () => {
if (!expSeleccionado || !modeloGeneradorId) return;

const modelo = modelos.find((m) => String(m.id) === modeloGeneradorId);
if (!modelo) return;

setTextoGenerado(reemplazarVariables(modelo.contenido, expSeleccionado));
};

const aplicarFormato = (comando: string) => {
editorRef.current?.focus();
document.execCommand(comando, false);
setTextoGenerado(editorRef.current?.innerHTML || "");
};

const copiarTextoGenerado = async () => {
if (!textoGenerado) return;

try {
await navigator.clipboard.writeText(htmlToText(textoGenerado));
alert("Texto copiado.");
} catch {
alert("No se pudo copiar."); const descargarPdfEscrito = () => { };
}



if (!textoGenerado.trim()) {
alert("Primero generá un escrito.");
return;
}

const doc = new jsPDF();
const titulo = expSeleccionado?.titulo || "Escrito generado";
const cliente = expSeleccionado?.cliente || "";

doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.text("IusCloud - Escrito generado", 15, 20);

doc.setFont("helvetica", "normal");
doc.setFontSize(11);
doc.text(`Expediente: ${titulo}`, 15, 30);
doc.text(`Cliente: ${cliente}`, 15, 36);
doc.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 15, 42);

doc.line(15, 46, 195, 46);

const lineas = doc.splitTextToSize(htmlToText(textoGenerado), 180);
let y = 56;

lineas.forEach((linea: string) => {
if (y > 280) {
doc.addPage();
y = 20;
}
doc.text(linea, 15, y);
y += 7;
});

const nombreArchivo =
expSeleccionado?.titulo
?.toLowerCase()
.replace(/[^a-z0-9áéíóúñ\s_-]/gi, "")
.replace(/\s+/g, "_")
.slice(0, 50) || "escrito";

doc.save(`${nombreArchivo}.pdf`);
};

const clientesFiltrados = useMemo(() => {
const q = busquedaCliente.trim().toLowerCase();
if (!q) return clientes;

return clientes.filter((c) =>
[
c.nombre,
c.email,
c.telefono,
c.documento,
c.domicilio,
c.observaciones,
]
.join(" ")
.toLowerCase()
.includes(q)
);
}, [clientes, busquedaCliente]);

const expedientesFiltrados = useMemo(() => {
const q = busquedaExpediente.trim().toLowerCase();

return [...expedientes]
.filter((e) =>
[
e.titulo,
e.numero,
e.juzgado,
e.cliente,
e.tipoProceso,
e.estadoExpediente,
]
.join(" ")
.toLowerCase()
.includes(q)
)
.sort((a, b) => prioridad(a) - prioridad(b));
}, [expedientes,busquedaExpediente]); const items: AgendaItem[] = [];

const agendaItems = useMemo(() => {


expedientes.forEach((exp) => {
if (exp.vencimiento) {
items.push({
fecha: exp.vencimiento,
tipo: "vencimiento",
texto: "Vencimiento del expediente",
expedienteId: exp.id,
expedienteTitulo: exp.titulo,
cliente: exp.cliente,
});
}

exp.movimientos.forEach((mov) => {
if (!mov.fecha) return;

items.push({
fecha: mov.fecha,
tipo: mov.tipo,
texto: mov.texto,
expedienteId: exp.id,
expedienteTitulo: exp.titulo,
cliente: exp.cliente,
});
});
});

return items.sort((a, b) => a.fecha.localeCompare(b.fecha));
}, [expedientes]);

const diasDelMes = useMemo(() => {
const primerDia = new Date(anioActual, mesActual, 1);
const ultimoDia = new Date(anioActual, mesActual + 1, 0);
const primerDiaSemana = (primerDia.getDay() + 6) % 7;
const cantidadDias = ultimoDia.getDate();

const celdas: Array<{
fecha: string | null;
diaNumero: number | null;
items: AgendaItem[];
}> = [];

for (let i = 0; i < primerDiaSemana; i++) {
celdas.push({ fecha: null, diaNumero: null, items: [] });
}

for (let dia = 1; dia <= cantidadDias; dia++) {
const fechaObj = new Date(anioActual, mesActual, dia);
const fechaStr = fechaObj.toISOString().slice(0, 10);

celdas.push({
fecha: fechaStr,
diaNumero: dia,
items: agendaItems.filter((a) => a.fecha === fechaStr),
});
}

while (celdas.length % 7 !== 0) {
celdas.push({ fecha: null, diaNumero: null, items: [] });
}

return celdas;
}, [anioActual, mesActual, agendaItems]);

const itemsDelDiaSeleccionado = agendaItems.filter(
(a) => a.fecha === fechaSeleccionada
);

const cambiarMes = (direccion: -1 | 1) => {
if (direccion === -1) {
if (mesActual === 0) {
setMesActual(11);
setAnioActual((prev) => prev - 1);
} else {
setMesActual((prev) => prev - 1);
}
} else {
if (mesActual === 11) {
setMesActual(0);
setAnioActual((anterior) => anterior + 1);
} else {
setMesActual((anterior) => anterior + 1);
}
}
};

const nombreMes = new Date(anioActual, mesActual).toLocaleDateString(
"es-AR",
{
mes: "largo",
año: "numeric",
}
);

const honorariosTotales = expedientes.reduce(
(acc, e) => acc + e.honorariosPresupuestados,
0
);

const honorariosCobradosTotales = expedientes.reduce(
(acc, e) => acc + e.honorariosCobrados,
0
);

return (
<div style={styles.layout}>
<aside style={styles.sidebar}>
<div>
<div style={styles.brandBox}>
<div style={styles.brandIcon}>IC</ div>
<div>
<div style={styles.brandTitle}> IusCloud</div>
<div style={styles.brandSubtitle}> Jurídico Pro</div>
</div>
</div>

<nav style={{ marginTop:24 }}>
<SidebarButton
active={vista === "dashboard"}
onClick={() => irAVista("dashboard")}
>
Dashboard
</SidebarButton>
<SidebarButton
active={vista === "clientes"}
onClick={() => irAVista("clientes")}
>
Clientes
</SidebarButton>
<SidebarButton
active={vista === "expedientes"}
onClick={() => irAVista("expedientes")}
>
Expedientes
</SidebarButton>
<SidebarButton
active={vista === "agenda"}
onClick={() => irAVista("agenda")}
>
Agenda
</SidebarButton>
<SidebarButton
active={vista === "tipos"}
onClick={() => irAVista("tipos")}
>
Tipos de Proceso
</SidebarButton>
<SidebarButton
active={vista === "modelos"}
onClick={() => irAVista("modelos")}
>
Modelos de Escrito
</SidebarButton>
</nav>
</div>
</aside>

<main style={styles.main}>
{view === "dashboard" && (
<>
<div style={styles.topbar}>
<div>
<h1 style={{ margin: 0, fontSize: 30 }}>IusCloud ⚖️</h1>
<p style={{ marginTop: 6, color: "#64748b" }}>
Panel legal con agenda, documentos y escritos
</p>
</div>
</div>

| ​​​​​​​​"
expired"; }).length } /> <StatCard title="Next to expire" value={ expedientes.filter((e) => obtenerAlerta(e) === "next") .length } /> </div> <div style={styles.twoCols}> <div style={styles.card}> <h2 style={styles.sectionTitle}> Próximos eventos</h2> {agendaItems.length === 0 ? ( <p style={styles.muted}>No se cargaron eventos.</p> ) : ( agendaItems.slice(0, 5).map((item, i) => ( <div key={i} style={styles.agendaItem}> <div style={{ fontWeight: 700, color: colorEvento(item.tipo), }} > {item.tipo.toUpperCase()} — {item.fecha} </div> <div style={{ marginTop: 4 }}>{item.text}</div> <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, }} > {item.expedienteTitulo} — {item.cliente} </div>














































</div>
))
)}
</div>

<div style={styles.card}>
<h2 style={styles.sectionTitle}>Resumen</h2>
<div style={styles.summaryLine}>
Clientes cargados: <strong>{clientes.length}</strong>
</div>
<div style={styles.summaryLine}>
Expedientes activos: <strong>{expedientes.length}</strong>
</div>
<div style={styles.summaryLine}>
Modelos cargados: <strong>{modelos.length}</strong>
</div>
<div style={styles.summaryLine}>
Honorarios presupuestados:{" "}
<strong>{formatCurrency(honorariosTotales)}</strong>
</div>
<div>
Honorarios cobrados:{" "}
<strong>{formatCurrency(honorariosCobradosTotales)}</strong>
</div>
</div>
</div>
</>
)}

{vista === "clientes" && !clienteSeleccionado && (
<div style={styles.card}>
<h2 style={styles.sectionTitle}>Clientes</h2>

<div style={styles.formGrid}>
<input
placeholder="Nombre completo"
value={nuevoCliente.nombre}
onChange={(e) =>
setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })
}
style={styles.input}
/>
<input
placeholder="Teléfono"
value={nuevoCliente.telefono}
onChange={(e) =>
setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })
}
style={styles.input}
/>
<input
placeholder="Email"
value={nuevoCliente.email}
onChange={(e) =>
setNuevoCliente({ ...nuevoCliente, email: e.target.valor }) placeholder="DNI / CUIT" <input /> estilo={styles.input}
}




value={nuevoCliente.documento}
onChange={(e) =>
setNuevoCliente({
...nuevoCliente,
documento: e.target.value,
})
}
style={styles.input}
/>
<input
placeholder="Domicilio"
value={nuevoCliente.domicilio}
onChange={(e) =>
setNuevoCliente({
...nuevoCliente,
domicilio: e.target.value,
})
}
style={{ ...styles.input, gridColumn: "1 / -1" }}
/>
<textarea
placeholder="Observaciones"
value={nuevoCliente.observaciones}
onChange={(e) =>
setNuevoCliente({
...nuevoCliente,
observaciones: e.target.value,
})
}
style={{ ...styles.textarea, gridColumn: "1 / -1" }}
/>
</div>

<div style={{ marginTop: 12 }}>
<button style={styles.btn} onClick={agregarCliente}>
Agregar cliente
</button>
</div>

<div style={{ marginTop: 24 }}>
<input
placeholder="Buscar por nombre, email, teléfono, DNI..."
value={busquedaCliente}
onChange={(e) => setBusquedaCliente(e.target.value)}
style={{ ...styles.input, width: "100%", marginBottom: 12 }}
/>

{clientesFiltrados.length === 0 ? (
<p style={styles.muted}>No hay clientes cargados.</p>
) : (
clientesFiltrados.map((c) => (
<div key={c.id} style={styles.itemBase}>
<div>
<strong>{c.nombre}</strong>
<div
style={{
fontSize: 12,
color: "#666",
marginTop: 4, {c.email || "Correo electrónico sin sentido"} ·{" "} >
}}


{c.telefono || "Sin teléfono"}
</div>
</div>
<button
style={styles.btnSmall}
onClick={() => setClienteSeleccionado(c)}
>
Ver ficha
</button>
</div>
))
)}
</div>
</div>
)}

{vista === "clientes" && clienteSeleccionado && (
<div style={styles.card}>
<button
style={styles.btnGhost}
onClick={() => setClienteSeleccionado(null)}
>
← Volver
</button>

<h2 style={{ marginTop: 16 }}>Ficha del cliente</h2>

<div style={styles.formGrid}>
<input
value={clienteSeleccionado.nombre}
onChange={(e) =>
setClienteSeleccionado({
...clienteSeleccionado,
nombre: e.target.value,
})
}
style={styles.input}
/>
<input
value={clienteSeleccionado.telefono}
onChange={(e) =>
setClienteSeleccionado({
...clienteSeleccionado,
telefono: e.target.value,
})
}
style={styles.input}
/>
<input
value={clienteSeleccionado.email}
onChange={(e) =>
setClienteSeleccionado({
...clienteSeleccionado,
email: e.target.value,
})
}
style={styles.input}
/>
<input
value={clienteSeleccionado.documento}
onChange={(e) =>
setClienteSeleccionado({
...clienteSeleccionado,
documento: e.target.value, /> style={styles.input} }
})



<input
value={clienteSeleccionado.domicilio}
onChange={(e) =>
setClienteSeleccionado({
...clienteSeleccionado,
domicilio: e.target.value,
})
}
style={{ ...styles.input, gridColumn: "1 / -1" }}
/>
<textarea
value={clienteSeleccionado.observaciones}
onChange={(e) =>
setClienteSeleccionado({
...clienteSeleccionado,
observaciones: e.target.value,
})
}
style={{ ...styles.textarea, gridColumn: "1 / -1" }}
/>
</div>

<div style={{ marginTop: 12 }}>
<button style={styles.btn} onClick={guardarClienteSeleccionado}>
Guardar cambios
</button>
</div>
</div>
)}

{vista === "expedientes" && !expSeleccionado && (
<div style={styles.card}>
<h2 style={styles.sectionTitle}>Expedientes</h2>

<div style={styles.formGrid}>
<input
placeholder="Título"
value={tituloExp}
onChange={(e) => setTituloExp(e.target.value)}
style={styles.input}
/>
<input
placeholder="Número de expediente"
value={numeroExp}
onChange={(e) => setNumeroExp(e.target.value)}
style={styles.input}
/>
<input
placeholder="Juzgado"
value={juzgadoExp}
onChange={(e) => setJuzgadoExp(e.target.value)}
style={styles.input}
/>
<select
value={clienteExpedienteId}
onChange={(e) => setClienteExpedienteId(e.target.value)}
style={styles.input}
>
<option value="">Cliente</option>
{clientes.map((c) => ( )}>c.id} value={String(c.id
<option key={
{c.nombre}
</option>
))}
</select>
<select
value={tipoProcesoExp}
onChange={(e) => setTipoProcesoExp(e.target. value)}
style={styles.input}
>
{tiposProceso.map((tp) => (
<option key={tp} value={tp}>
{tp}
</option>
))}
</select>
<select
value={estadoExp}
onChange={(e) =>
setEstadoExp(e.target.value as EstadoExpediente)
}
style={styles.input}
>
{ESTADOS.map((estado) => (
<option key={estado} value={estado}>
{estado}
</option>
))}
</select>
<input
type="date"
value={vencimientoExp}
onChange={(e) => setVencimientoExp(e.target. value)}
style={styles.input}
/>
<input
placeholder="Honorarios presupuestados"
value={honorariosPres}
onChange={(e) =>
setHonorariosPres(e.target. value.replace(/[^\d]/g, ""))
}
style={styles.input}
/>
<input
placeholder="Honorarios cobrados"
value={honorariosCob}
onChange={(e) =>
setHonorariosCob(e.target. value.replace(/[^\d]/g, ""))
}
style={styles.input}
/>
</div>

<div style={{ marginTop: 12 }}>
<button style={styles.btn} onClick={crearExpediente}>
Crear expediente
</button>
</div>

<div style={{ marginTop: 24 }}>
<input
placeholder="Buscar expediente..."
valor={busquedaExpediente}
onChange={(e) => setBusquedaExpediente(e. target.value)}
style={{ ...styles.input, width: "100%", marginBottom: 12 }}
/>

{expedientesFiltratos.length === 0 ? (
<p style={styles.muted}>No hay expedientes cargados.</p>
) : (
expedientesFiltrados.map((exp) => {
const alerta = obtenerAlerta(exp);

return (
<div key={ exp.id } style={styles.itemBase}>
<div>
<strong>{exp.titulo}</strong>
<div
style={{
fontSize: 12,
color: "#666",
marginTop: 4,
}}
>
{exp.numero} · {exp.juzgado} · {exp.cliente}
</div>
<div
style={{
marginTop: 8,
display: "flex",
gap: 8,
flexWrap: "wrap",
}}
>
<span style={badgeEstado(exp. estadoExpediente)}>
{exp.estadoExpediente}
</span>
{alerta !== "ok" && (
<span estilo={badgeAlerta(alerta)}>
{textoAlerta(alerta)}
</span>
)}
</div>
</div>

<button
style={styles.btnSmall}
onClick={() => setExpSeleccionado(exp)}
>
Ver
</button>
</div>
);
})
)}
</div>
</div>
)}

{vista === "expedientes" && expSeleccionado && (
<div style={styles.card}>
<button
style={styles.btnGhost}
onClick={() => setExpSeleccionado(null)}
>
← Volver
</button>

<h2 style={{ marginTop: 16 }}>{expSelected.title}</ h2>
<div style={{ marginBottom: 4 }}>
Número: <strong>{expSelected. number || "-"}</strong>
</div>
<div style={{ marginBottom: 4 }}>
Juzgado: <strong>{expSelected. judged || "-"}</strong>
</div>
<div style={{ marginBottom: 4 }}>
Cliente: <strong>{expSelected. client}</strong>
</div>
<div style={{ marginBottom: 10 }}>
Tipo de proceso: <strong>{expSelected. processType}</strong>
</div>

<div style={{ marginBottom: 16, maxWidth: 260 }}>
<label style={styles.fichaLabel}> Cambiar estado</label>
<select
value={expSelected. estadoOficina}
onChange={(e) =>
updateOfficeOffice(
e.target.value as OfficeOffice
)
}
style={styles.input}
>
{STATES.map((state) => (
<option key={state} value={state}>
{state}
</option>
))}
</select>
</div>

<div style={styles.cardInner}>
<h3>Movimientos</h3>

<div style={styles.rowWrap}>
<input
placeholder="Descripción"
value={movementText}
onChange={(e) => setMovementText(e.target.value)}
style={styles.input}
/>
<input
type="date"
value={movementClosed}
onChange={(e) => setMovementClosed(e.target.value)}
style={styles.input}
/>
<select
value={movType}
onChange={(e) =>
setMovType(e.target.value as MovimientType)
}
estilo={estilos.input}
>
<option value="tarea">Tarea</option>
<option value="vencimiento">Vencimiento</option>
<option value="nota">Nota</option>
</select>
<button style={styles.btn} onClick={agregarMovimiento}>
Agregar
</button>
</div>

{expSeleccionado.movimientos.length === 0 ? (
<p style={styles.muted}>Todavía no hay movimientos.</p>
) : (
expSeleccionado.movimientos.map((m, i) => (
<div key={i} style={styles.itemBase}>
<div>
<strong>{m.fecha}</strong>
<div>{m.texto}</div>
<div style={{ fontSize: 12, color: "#666" }}>
{m.tipo} · {m.estado}
</div>
</div>
<button
style={styles.btnSmall}
onClick={() => toggleEstadoMovimiento(i)}
>
{m.estado === "pendiente"
? "Marcar hecho"
: "Marcar pendiente"}
</button>
</div>
))
)}
</div>

<div style={styles.cardInner}>
<h3>Generador de escritos</h3>

<div style={styles.rowWrap}>
<select
value={modeloGeneradorId}
onChange={(e) => setModeloGeneradorId(e.target.value)}
style={styles.input}
>
<option value="">Elegir modelo</option>
{modelos.map((m) => (
<option key={m.id} value={String(m.id)}>
{m.nombre}
</option>
))}
</select>

<button style={styles.btn} onClick={generarTextoDesdeModelo}>
Generar texto
</button>

<button style={styles.<button style={styles.btnDanger} onClick={copiarTextoGenerado}> </div> </button> Descargar PDF <button style={styles.btnDanger} onClick={descargarPdfEscrito}> </button>
Copiar







<div
style={{
display: "flex",
gap: 8,
flexWrap: "wrap",
marginBottom: 12,
}}
>
<button
style={styles.btnGhost}
onClick={() => aplicarFormato("bold")}
>
Negrita
</button>
<button
style={styles.btnGhost}
onClick={() => aplicarFormato("italic")}
>
Cursiva
</button>
<button
style={styles.btnGhost}
onClick={() => aplicarFormato("underline")}
>
Subrayado
</button>
<button
style={styles.btnGhost}
onClick={() => aplicarFormato(" insertUnorderedList")}
>
Lista
</button>
<button
style={styles.btnGhost}
onClick={() => aplicarFormato("justifyLeft")}
>
Izq
</button>
<button
style={styles.btnGhost}
onClick={() => aplicarFormato("justifyCenter" )}
>
Centro
</button>
<button
style={styles.btnGhost}
onClick={() => aplicarFormato("justifyRight") }
>
Der
</button>
</div>

<div
ref={editorRef}
contentEditable
suppressContentEditableWarning
onInput={(e) =>
setTextoGenerado((e.target as HTMLDivElement).innerHTML)
}
style={styles.editor}
/>
</div>
</div>
)}

{vista === "agenda" && (
<div style={styles.card}>
<div style={styles.calendarHeader}>
<h2 style={styles.sectionTitle}>Agenda</h2>

<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
<button
style={styles.btnSmall}
onClick={() => cambiarMes(-1)}
>
←
</button>
<div
style={{
fontWeight: 700,
minWidth: 180,
textAlign: "center",
textTransform: "capitalize",
}}
>
{nombreMes}
</div>
<button style={styles.btnSmall} onClick={() => cambiarMes(1)}>
→
</button>
</div>
</div>

<div style={styles.weekHeader}>
{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
<div key={d} style={styles.weekDay}>
{d}
</div>
))}
</div>

<div style={styles.calendarGrid}>
{diasDelMes.map((celda, i) => (
<div
key={i}
style={{
...styles.dayCell,
background:
celda.fecha && fechaSeleccionada === celda.fecha
? "#dbeafe"
: "white",
}}
onClick={() => celda.fecha && setFechaSeleccionada(celda. fecha)}
>
{celda.diaNumero && (
<>
<div style={{ fontWeight: 700, marginBottom: 8 }}>
{celda.diaNumero}
</div>
<div
style={{
display: "flex",
flexDirection: "column",
gap: 4,
}}
>
{celda.items.slice(0, 3).map((item,idx) => (
<div
key={idx}
style={{
...styles.pill,
background: colorEvento(item.tipo),
}}
>
