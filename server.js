require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
fs.mkdirSync(uploadDir);
}

app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
destination: function (req, file, cb) {
cb(null, uploadDir);
},
filename: function (req, file, cb) {
const cleanName = file.originalname.replace(/\s+/g, "-");
const uniqueName = Date.now() + "-" + cleanName;
cb(null, uniqueName);
},
});

const upload = multer({
storage,
fileFilter: function (req, file, cb) {
if (file.mimetype !== "application/pdf") {
return cb(new Error("Solo se permiten archivos PDF"));
}
cb(null, true);
},
});

const JWT_SECRET = process.env.JWT_SECRET || "iuscloud_secret_dev";

mongoose
.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB conectado"))
.catch((err) => console.error("❌ Error Mongo:", err.message));

const UsuarioSchema = new mongoose.Schema(
{
nombre: String,
email: { type: String, unique: true },
password: String,
estudio: String,
proveedor: { type: String, default: "local" },
},
{ timestamps: true }
);

const ClienteSchema = new mongoose.Schema(
{
userId: String,
nombre: String,
email: String,
telefono: String,
domicilio: String,
dni: String,
observaciones: String,
},
{ timestamps: true }
);

const TareaSchema = new mongoose.Schema(
{
titulo: String,
descripcion: String,
estado: { type: String, default: "Pendiente" },
vencimiento: String,
archivoUrl: String,
createdAt: { type: Date, default: Date.now },
},
{ _id: true }
);

const HistorialSchema = new mongoose.Schema(
{
tipo: String,
detalle: String,
fecha: { type: Date, default: Date.now },
},
{ _id: true }
);

const MovimientoSchema = new mongoose.Schema(
{
tipo: String,
monto: Number,
fecha: String,
concepto: String,
},
{ _id: true }
);

const ExpedienteSchema = new mongoose.Schema(
{
userId: String,
titulo: String,
numero: String,
juzgado: String,
cliente: String,
tipo: String,
jurisdiccion: String,
vencimiento: String,
descripcion: String,
estado: String,
tareas: [TareaSchema],
historial: [HistorialSchema],
movimientos: [MovimientoSchema],
},
{ timestamps: true }
);

const TipoProcesoSchema = new mongoose.Schema(
{
userId: String,
nombre: String,
descripcion: String,
},
{ timestamps: true }
);

const ModeloSchema = new mongoose.Schema(
{
userId: String,
titulo: String,
tipo: String,
contenido: String,
},
{ timestamps: true }
);

const Usuario = mongoose.model("Usuario", UsuarioSchema);
const Cliente = mongoose.model("Cliente", ClienteSchema);
const Expediente = mongoose.model("Expediente", ExpedienteSchema);
const TipoProceso = mongoose.model("TipoProceso", TipoProcesoSchema);
const Modelo = mongoose.model("Modelo", ModeloSchema);

function auth(req, res, next) {
const token = (req.headers.authorization || "").replace("Bearer ", "");

if (!token) {
return res.status(401).json({ error: "No autorizado" });
}

try {
req.user = jwt.verify(token, JWT_SECRET);
next();
} catch {
res.status(401).json({ error: "Sesión inválida" });
}
}

// UPLOAD PDF
app.post("/api/upload", auth, upload.single("archivo"), (req, res) => {
try {
if (!req.file) {
return res.status(400).json({ error: "No se subió archivo" });
}

const url = "/uploads/" + req.file.filename;
res.json({ ok: true, url });
} catch {
res.status(500).json({ error: "Error al subir archivo" });
}
});

// AUTH
app.post("/api/auth/register", async (req, res) => {
try {
const { nombre, email, password, estudio } = req.body;

if (!email || !password) {
return res.status(400).json({ error: "Email y clave son obligatorios" });
}

const existe = await Usuario.findOne({ email });
if (existe) {
return res.status(400).json({ error: "Ese email ya existe" });
}

const hash = await bcrypt.hash(password, 10);

const usuario = await Usuario.create({
nombre,
email,
password: hash,
estudio: estudio || nombre || "Mi estudio jurídico",
});

const token = jwt.sign(
{
id: usuario._id,
email: usuario.email,
estudio: usuario.estudio,
},
JWT_SECRET,
{ expiresIn: "7d" }
);

res.json({
ok: true,
token,
usuario: {
nombre: usuario.nombre,
email: usuario.email,
estudio: usuario.estudio,
},
});
} catch {
res.status(500).json({ error: "Error al registrar usuario" });
}
});

app.post("/api/auth/login", async (req, res) => {
try {
const { email, password } = req.body;

const usuario = await Usuario.findOne({ email });
if (!usuario) {
return res.status(400).json({ error: "Usuario no encontrado" });
}

const ok = await bcrypt.compare(password, usuario.password);
if (!ok) {
return res.status(400).json({ error: "Clave incorrecta" });
}

const token = jwt.sign(
{
id: usuario._id,
email: usuario.email,
estudio: usuario.estudio,
},
JWT_SECRET,
{ expiresIn: "7d" }
);

res.json({
ok: true,
token,
usuario: {
nombre: usuario.nombre,
email: usuario.email,
estudio: usuario.estudio,
},
});
} catch {
res.status(500).json({ error: "Error al iniciar sesión" });
}
});

// DASHBOARD
app.get("/api/dashboard", auth, async (req, res) => {
try {
const userId = req.user.id;
const hoy = new Date().toISOString().slice(0, 10);

const clientes = await Cliente.countDocuments({ userId });
const expedientes = await Expediente.countDocuments({ userId });
const tipos = await TipoProceso.countDocuments({ userId });
const modelos = await Modelo.countDocuments({ userId });

const exps = await Expediente.find({ userId });
const alertas = [];

exps.forEach((e) => {
if (e.vencimiento && e.vencimiento <= hoy) {
alertas.push({
tipo: "Expediente vencido",
titulo: e.titulo || "Sin título",
fecha: e.vencimiento,
});
}

(e.tareas || []).forEach((t) => {
if (t.vencimiento && t.estado !== "Realizada") {
alertas.push({
tipo: "Tarea pendiente",
titulo: (e.titulo || "Expediente") + " - " + (t.titulo || "Tarea"),
fecha: t.vencimiento,
});
}
});
});

res.json({ clientes, expedientes, tipos, modelos, alertas });
} catch {
res.status(500).json({ error: "Error al cargar dashboard" });
}
});

// CLIENTES
app.get("/api/clientes", auth, async (req, res) => {
try {
const q = req.query.q || "";

const filtro = {
userId: req.user.id,
...(q
? {
$or: [
{ nombre: { $regex: q, $options: "i" } },
{ email: { $regex: q, $options: "i" } },
{ dni: { $regex: q, $options: "i" } },
{ telefono: { $regex: q, $options: "i" } },
],
}
: {}),
};

const clientes = await Cliente.find(filtro).sort({ createdAt: -1 });
res.json(clientes);
} catch {
res.status(500).json({ error: "Error al cargar clientes" });
}
});

app.post("/api/clientes", auth, async (req, res) => {
try {
const cliente = await Cliente.create({
...req.body,
userId: req.user.id,
});

res.json({ ok: true, cliente });
} catch {
res.status(500).json({ error: "Error al guardar cliente" });
}
});

app.delete("/api/clientes/:id", auth, async (req, res) => {
try {
await Cliente.findOneAndDelete({
_id: req.params.id,
userId: req.user.id,
});

res.json({ ok: true });
} catch {
res.status(500).json({ error: "Error al eliminar cliente" });
}
});

// EXPEDIENTES
app.get("/api/expedientes", auth, async (req, res) => {
try {
const q = req.query.q || "";

const filtro = {
userId: req.user.id,
...(q
? {
$or: [
{ titulo: { $regex: q, $options: "i" } },
{ numero: { $regex: q, $options: "i" } },
{ juzgado: { $regex: q, $options: "i" } },
{ cliente: { $regex: q, $options: "i" } },
{ estado: { $regex: q, $options: "i" } },
],
}
: {}),
};

const expedientes = await Expediente.find(filtro).sort({ createdAt: -1 });
res.json(expedientes);
} catch {
res.status(500).json({ error: "Error al cargar expedientes" });
}
});

app.get("/api/expedientes/:id", auth, async (req, res) => {
try {
const expediente = await Expediente.findOne({
_id: req.params.id,
userId: req.user.id,
});

if (!expediente) {
return res.status(404).json({ error: "No encontrado" });
}

res.json(expediente);
} catch {
res.status(500).json({ error: "Error al cargar expediente" });
}
});

app.post("/api/expedientes", auth, async (req, res) => {
try {
const expediente = await Expediente.create({
...req.body,
userId: req.user.id,
tareas: [],
movimientos: [],
historial: [
{
tipo: "Creación",
detalle: "Expediente creado",
},
],
});

res.json({ ok: true, expediente });
} catch {
res.status(500).json({ error: "Error al guardar expediente" });
}
});

app.delete("/api/expedientes/:id", auth, async (req, res) => {
try {
await Expediente.findOneAndDelete({
_id: req.params.id,
userId: req.user.id,
});

res.json({ ok: true });
} catch {
res.status(500).json({ error: "Error al eliminar expediente" });
}
});

// TAREAS
app.post("/api/expedientes/:id/tareas", auth, async (req, res) => {
try {
const expediente = await Expediente.findOne({
_id: req.params.id,
userId: req.user.id,
});

if (!expediente) {
return res.status(404).json({ error: "No encontrado" });
}

expediente.tareas.push({
titulo: req.body.titulo,
descripcion: req.body.descripcion,
estado: req.body.estado || "Pendiente",
vencimiento: req.body.vencimiento,
archivoUrl: req.body.archivoUrl,
});

expediente.historial.push({
tipo: "Tarea",
detalle: "Se agregó tarea: " + (req.body.titulo || "Sin título"),
});

await expediente.save();

res.json({ ok: true, expediente });
} catch {
res.status(500).json({ error: "Error al guardar tarea" });
}
});

app.patch("/api/expedientes/:id/tareas/:tareaId", auth, async (req, res) => {
try {
const expediente = await Expediente.findOne({
_id: req.params.id,
userId: req.user.id,
});

if (!expediente) {
return res.status(404).json({ error: "No encontrado" });
}

const tarea = expediente.tareas.id(req.params.tareaId);

if (!tarea) {
return res.status(404).json({ error: "Tarea no encontrada" });
}

tarea.estado = req.body.estado || tarea.estado;

expediente.historial.push({
tipo: "Tarea",
detalle:
"Tarea actualizada: " +
(tarea.titulo || "Sin título") +
" (" +
tarea.estado +
")",
});

await expediente.save();

res.json({ ok: true, expediente });
} catch {
res.status(500).json({ error: "Error al actualizar tarea" });
}
});

// CONTABILIDAD
app.post("/api/expedientes/:id/contabilidad", auth, async (req, res) => {
try {
const expediente = await Expediente.findOne({
_id: req.params.id,
userId: req.user.id,
});

if (!expediente) {
return res.status(404).json({ error: "No encontrado" });
}

expediente.movimientos.push({
tipo: req.body.tipo,
monto: Number(req.body.monto || 0),
fecha: req.body.fecha,
concepto: req.body.concepto,
});

expediente.historial.push({
tipo: "Contabilidad",
detalle:
(req.body.tipo || "Movimiento") +
": $" +
Number(req.body.monto || 0),
});

await expediente.save();

res.json({ ok: true, expediente });
} catch {
res.status(500).json({ error: "Error al guardar movimiento" });
}
});

// TIPOS
app.get("/api/tipos", auth, async (req, res) => {
try {
const tipos = await TipoProceso.find({ userId: req.user.id }).sort({
createdAt: -1,
});

res.json(tipos);
} catch {
res.status(500).json({ error: "Error al cargar tipos" });
}
});

app.post("/api/tipos", auth, async (req, res) => {
try {
const tipo = await TipoProceso.create({
...req.body,
userId: req.user.id,
});

res.json({ ok: true, tipo });
} catch {
res.status(500).json({ error: "Error al guardar tipo" });
}
});

app.delete("/api/tipos/:id", auth, async (req, res) => {
try {
await TipoProceso.findOneAndDelete({
_id: req.params.id,
userId: req.user.id,
});

res.json({ ok: true });
} catch {
res.status(500).json({ error: "Error al eliminar tipo" });
}
});

// MODELOS
app.get("/api/modelos", auth, async (req, res) => {
try {
const modelos = await Modelo.find({ userId: req.user.id }).sort({
createdAt: -1,
});

res.json(modelos);
} catch {
res.status(500).json({ error: "Error al cargar modelos" });
}
});

app.post("/api/modelos", auth, async (req, res) => {
try {
const modelo = await Modelo.create({
...req.body,
userId: req.user.id,
});

res.json({ ok: true, modelo });
} catch {
res.status(500).json({ error: "Error al guardar modelo" });
}
});

app.delete("/api/modelos/:id", auth, async (req, res) => {
try {
await Modelo.findOneAndDelete({
_id: req.params.id,
userId: req.user.id,
});

res.json({ ok: true });
} catch {
res.status(500).json({ error: "Error al eliminar modelo" });
}
});

// FRONTEND
app.get("*", (req, res) => {
res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("🚀 Servidor corriendo en puerto " + PORT);
});