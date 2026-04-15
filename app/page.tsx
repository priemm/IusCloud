"use client";

import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";

type Cliente = {
id: number;
nombre: string;
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

const [nombreCliente, setNombreCliente] = useState("");
const [tituloExp, setTituloExp] = useState("");
const [clienteExp, setClienteExp] = useState("");

const [expSeleccionado, setExpSeleccionado] =
useState<Expediente | null>(null);

const editorRef = useRef<HTMLDivElement>(null);

// --- STORAGE ---
useEffect(() => {
const c = localStorage.getItem("clientes");
const e = localStorage.getItem("expedientes");

if (c) setClientes(JSON.parse(c));
if (e) setExpedientes(JSON.parse(e));
}, []);

useEffect(() => {
localStorage.setItem("clientes", JSON.stringify(clientes));
}, [clientes]);

useEffect(() => {
localStorage.setItem("expedientes", JSON.stringify(expedientes));
}, [expedientes]);

// --- CLIENTES ---
const agregarCliente = () => {
if (!nombreCliente) return;

const nuevo = {
id: Date.now(),
nombre: nombreCliente,
};

setClientes([nuevo, ...clientes]);
setNombreCliente("");
};

// --- EXPEDIENTES ---
const crearExpediente = () => {
if (!tituloExp || !clienteExp) return;

const nuevo = {
id: Date.now(),
titulo: tituloExp,
cliente: clienteExp,
};

setExpedientes([nuevo, ...expedientes]);
setTituloExp("");
};

// --- GENERADOR ---
const generarTexto = () => {
if (!expSeleccionado) return;

const texto = `Se presenta ${expSeleccionado.cliente} en autos "${expSeleccionado.titulo}", solicitando lo que corresponda en derecho.`;

if (editorRef.current) {
editorRef.current.innerText = texto;
}
};

// --- FORMATO ---
const format = (cmd: string) => {
document.execCommand(cmd);
};

// --- PDF ---
const descargarPDF = () => {
const doc = new jsPDF();

const contenido = editorRef.current?.innerText || "";

const lines = doc.splitTextToSize(contenido, 180);

doc.text(lines, 10, 10);

doc.save("escrito.pdf");
};

return (
<div style={{ display: "flex", height: "100vh", fontFamily: "Arial" }}>
{/* SIDEBAR */}
<div
style={{
width: 220,
background: "#111",
color: "white",
padding: 20,
}}
>
<h2>IusCloud</h2>

<button onClick={() => setVista("dashboard")}>Dashboard</button>
<br />
<button onClick={() => setVista("clientes")}>Clientes</button>
<br />
<button onClick={() => setVista("expedientes")}>Expedientes</button>
</div>

{/* MAIN */}
<div style={{ flex: 1, padding: 20 }}>
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

<input
placeholder="Nombre"
value={nombreCliente}
onChange={(e) => setNombreCliente(e.target.value)}
/>

<button onClick={agregarCliente}>Agregar</button>

{clientes.map((c) => (
<div key={c.id}>{c.nombre}</div>
))}
</>
)}

{/* EXPEDIENTES */}
{vista === "expedientes" && !expSeleccionado && (
<>
<h1>Expedientes</h1>

<input
placeholder="Título"
value={tituloExp}
onChange={(e) => setTituloExp(e.target.value)}
/>

<input
placeholder="Cliente"
value={clienteExp}
onChange={(e) => setClienteExp(e.target.value)}
/>

<button onClick={crearExpediente}>Crear</button>

{expedientes.map((e) => (
<div key={e.id}>
{e.titulo} - {e.cliente}
<button onClick={() => setExpSeleccionado(e)}>
Abrir
</button>
</div>
))}
</>
)}

{/* DETALLE EXPEDIENTE */}
{expSeleccionado && (
<>
<button onClick={() => setExpSeleccionado(null)}>← Volver</button>

<h2>{expSeleccionado.titulo}</h2>

<button onClick={generarTexto}>Generar escrito</button>

<div style={{ marginTop: 10 }}>
<button onClick={() => format("bold")}>B</button>
<button onClick={() => format("italic")}>I</button>
<button onClick={() => format("underline")}>U</button>
</div>

<div
ref={editorRef}
contentEditable
style={{
border: "1px solid #ccc",
minHeight: 200,
padding: 10,
marginTop: 10,
}}
/>

<button style={{ marginTop: 10 }} onClick={descargarPDF}>
Descargar PDF
</button>
</>
)}
</div>
</div>
);
}
