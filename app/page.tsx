"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";

type Cliente = {
id: number;
nombre: string;
telefono: string;
email: string;
};

type Expediente = {
id: number;
titulo: string;
cliente: string;
};

export default function Home() {
const [vista, setVista] = useState("dashboard");

const [clientes, setClientes] = useState<Cliente[]>([]);
const [expedientes, setExpedientes] = useState<Expediente[]>([]);

const [nuevoCliente, setNuevoCliente] = useState({
nombre: "",
telefono: "",
email: "",
});

const [nuevoExp, setNuevoExp] = useState({
titulo: "",
cliente: "",
});

const [texto, setTexto] = useState("");

// =========================
// CLIENTES
// =========================
const agregarCliente = () => {
if (!nuevoCliente.nombre) return;

setClientes([
{ id: Date.now(), ...nuevoCliente },
...clientes,
]);

setNuevoCliente({ nombre: "", telefono: "", email: "" });
};

// =========================
// EXPEDIENTES
// =========================
const agregarExpediente = () => {
if (!nuevoExp.titulo || !nuevoExp.cliente) return;

setExpedientes([
{ id: Date.now(), ...nuevoExp },
...expedientes,
]);

setNuevoExp({ titulo: "", cliente: "" });
};

// =========================
// PDF
// =========================
const descargarPDF = () => {
if (!texto) return;

const doc = new jsPDF();
const lines = doc.splitTextToSize(texto, 180);

doc.text(lines, 10, 20);
doc.save("escrito.pdf");
};

// =========================
// UI
// =========================
return (
<div style={{ display: "flex", height: "100vh", fontFamily: "Arial" }}>

{/* SIDEBAR */}
<div style={{
width: 220,
background: "#111",
color: "white",
padding: 20
}}>
<h2>IusCloud</h2>

<button style={btn} onClick={() => setVista("dashboard")}>Dashboard</button>
<button style={btn} onClick={() => setVista("clientes")}>Clientes</button>
<button style={btn} onClick={() => setVista("expedientes")}>Expedientes</button>
<button style={btn} onClick={() => setVista("textos")}>Textos</button>
</div>

{/* CONTENIDO */}
<div style={{ flex: 1, padding: 30 }}>

{/* DASHBOARD */}
{vista === "dashboard" && (
<>
<h1>Dashboard</h1>
<p>Clientes: {clientes.length}</p>
<p>Expedientes: {expedientes.length}</p>
</>
)}

{/* CLIENTES */}
{vista === "clientes" && (
<>
<h1>Clientes</h1>

<input placeholder="Nombre"
value={nuevoCliente.nombre}
onChange={e => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
/>
<input placeholder="Teléfono"
value={nuevoCliente.telefono}
onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
/>
<input placeholder="Email"
value={nuevoCliente.email}
onChange={e => setNuevoCliente({...nuevoCliente, email: e.target.value})}
/>

<button onClick={agregarCliente}>Agregar</button>

<ul>
{clientes.map(c => (
<li key={c.id}>{c.nombre}</li>
))}
</ul>
</>
)}

{/* EXPEDIENTES */}
{vista === "expedientes" && (
<>
<h1>Expedientes</h1>

<input placeholder="Título"
value={nuevoExp.titulo}
onChange={e => setNuevoExp({...nuevoExp, titulo: e.target.value})}
/>

<select
value={nuevoExp.cliente}
onChange={e => setNuevoExp({...nuevoExp, cliente: e.target.value})}
>
<option value="">Cliente</option>
{clientes.map(c => (
<option key={c.id} value={c.nombre}>{c.nombre}</option>
))}
</select>

<button onClick={agregarExpediente}>Agregar</button>

<ul>
{expedientes.map(e => (
<li key={e.id}>
{e.titulo} - {e.cliente}
</li>
))}
</ul>
</>
)}

{/* TEXTOS */}
{vista === "textos" && (
<>
<h1>Generador de escritos</h1>

<textarea
style={{ width: "100%", height: 200 }}
placeholder="Escribí o pegá tu modelo..."
value={texto}
onChange={e => setTexto(e.target.value)}
/>

<br /><br />

<button onClick={descargarPDF}>
Descargar PDF
</button>
</>
)}

</div>
</div>
);
}

// estilos
const btn = {
display: "block",
width: "100%",
marginBottom: 10,
padding: 10,
background: "#333",
color: "white",
border: "none",
cursor: "pointer"
};
