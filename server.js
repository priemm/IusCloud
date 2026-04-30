require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const JWT_SECRET = process.env.JWT_SECRET || "iuscloud_secret_dev";

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => console.error("❌ Error Mongo:", err.message));

const Usuario = mongoose.model("Usuario", new mongoose.Schema({
  nombre: String,
  email: { type: String, unique: true },
  password: String,
  estudio: String,
  proveedor: { type: String, default: "local" }
}, { timestamps: true }));

const Cliente = mongoose.model("Cliente", new mongoose.Schema({
  userId: String,
  nombre: String,
  email: String,
  telefono: String,
  domicilio: String,
  dni: String,
  observaciones: String
}, { timestamps: true }));

const TareaSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  estado: { type: String, default: "Pendiente" },
  vencimiento: String,
  archivoUrl: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const HistorialSchema = new mongoose.Schema({
  tipo: String,
  detalle: String,
  fecha: { type: Date, default: Date.now }
}, { _id: true });

const MovimientoSchema = new mongoose.Schema({
  tipo: String,
  monto: Number,
  fecha: String,
  concepto: String
}, { _id: true });

const Expediente = mongoose.model("Expediente", new mongoose.Schema({
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
  movimientos: [MovimientoSchema]
}, { timestamps: true }));

const TipoProceso = mongoose.model("TipoProceso", new mongoose.Schema({
  userId: String,
  nombre: String,
  descripcion: String
}, { timestamps: true }));

const Modelo = mongoose.model("Modelo", new mongoose.Schema({
  userId: String,
  titulo: String,
  tipo: String,
  contenido: String
}, { timestamps: true }));

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No autorizado" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Sesión inválida" });
  }
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { nombre, email, password, estudio } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email y clave son obligatorios" });

    const existe = await Usuario.findOne({ email });
    if (existe) return res.status(400).json({ error: "Ese email ya existe" });

    const hash = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create({
      nombre,
      email,
      password: hash,
      estudio: estudio || nombre || "Mi estudio jurídico"
    });

    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, estudio: usuario.estudio },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ ok: true, token, usuario: { nombre: usuario.nombre, email: usuario.email, estudio: usuario.estudio } });
  } catch {
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(400).json({ error: "Usuario no encontrado" });

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) return res.status(400).json({ error: "Clave incorrecta" });

    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, estudio: usuario.estudio },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ ok: true, token, usuario: { nombre: usuario.nombre, email: usuario.email, estudio: usuario.estudio } });
  } catch {
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

app.get("/api/dashboard", auth, async (req, res) => {
  const userId = req.user.id;
  const hoy = new Date().toISOString().slice(0, 10);

  const clientes = await Cliente.countDocuments({ userId });
  const expedientes = await Expediente.countDocuments({ userId });
  const tipos = await TipoProceso.countDocuments({ userId });
  const modelos = await Modelo.countDocuments({ userId });

  const exps = await Expediente.find({ userId });
  const alertas = [];

  exps.forEach(e => {
    if (e.vencimiento && e.vencimiento <= hoy) {
      alertas.push({ tipo: "Expediente vencido", titulo: e.titulo, fecha: e.vencimiento });
    }

    (e.tareas || []).forEach(t => {
      if (t.vencimiento && t.estado !== "Realizada") {
        alertas.push({ tipo: "Tarea pendiente", titulo: ${e.titulo} - ${t.titulo}, fecha: t.vencimiento });
      }
    });
  });

  res.json({ clientes, expedientes, tipos, modelos, alertas });
});

app.get("/api/clientes", auth, async (req, res) => {
  const q = req.query.q || "";
  const filtro = {
    userId: req.user.id,
    ...(q ? {
      $or: [
        { nombre: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { dni: { $regex: q, $options: "i" } },
        { telefono: { $regex: q, $options: "i" } }
      ]
    } : {})
  };

  res.json(await Cliente.find(filtro).sort({ createdAt: -1 }));
});

app.post("/api/clientes", auth, async (req, res) => {
  const cliente = await Cliente.create({ ...req.body, userId: req.user.id });
  res.json({ ok: true, cliente });
});

app.delete("/api/clientes/:id", auth, async (req, res) => {
  await Cliente.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  res.json({ ok: true });
});

app.get("/api/expedientes", auth, async (req, res) => {
  const q = req.query.q || "";
  const filtro = {
    userId: req.user.id,
    ...(q ? {
      $or: [
        { titulo: { $regex: q, $options: "i" } },
        { numero: { $regex: q, $options: "i" } },
        { juzgado: { $regex: q, $options: "i" } },
        { cliente: { $regex: q, $options: "i" } },
        { estado: { $regex: q, $options: "i" } }
      ]
    } : {})
  };

  res.json(await Expediente.find(filtro).sort({ createdAt: -1 }));
});

app.get("/api/expedientes/:id", auth, async (req, res) => {
  const expediente = await Expediente.findOne({ _id: req.params.id, userId: req.user.id });
  if (!expediente) return res.status(404).json({ error: "No encontrado" });
  res.json(expediente);
});

app.post("/api/expedientes", auth, async (req, res) => {
  const expediente = await Expediente.create({
    ...req.body,
    userId: req.user.id,
    tareas: [],
    movimientos: [],
    historial: [{ tipo: "Creación", detalle: "Expediente creado" }]
  });
  res.json({ ok: true, expediente });
});

app.delete("/api/expedientes/:id", auth, async (req, res) => {
  await Expediente.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  res.json({ ok: true });
});

app.post("/api/expedientes/:id/tareas", auth, async (req, res) => {
  const expediente = await Expediente.findOne({ _id: req.params.id, userId: req.user.id });
  if (!expediente) return res.status(404).json({ error: "No encontrado" });

  expediente.tareas.push(req.body);
  expediente.historial.push({ tipo: "Tarea", detalle: Se agregó tarea: ${req.body.titulo} });
  await expediente.save();

  res.json({ ok: true, expediente });
});

app.patch("/api/expedientes/:id/tareas/:tareaId", auth, async (req, res) => {
  const expediente = await Expediente.findOne({ _id: req.params.id, userId: req.user.id });
  if (!expediente) return res.status(404).json({ error: "No encontrado" });

  const tarea = expediente.tareas.id(req.params.tareaId);
  if (!tarea) return res.status(404).json({ error: "Tarea no encontrada" });

  tarea.estado = req.body.estado || tarea.estado;
  expediente.historial.push({ tipo: "Tarea", detalle: Tarea actualizada: ${tarea.titulo} (${tarea.estado}) });
  await expediente.save();

  res.json({ ok: true, expediente });
});

app.post("/api/expedientes/:id/contabilidad", auth, async (req, res) => {
  const expediente = await Expediente.findOne({ _id: req.params.id, userId: req.user.id });
  if (!expediente) return res.status(404).json({ error: "No encontrado" });

  expediente.movimientos.push(req.body);
  expediente.historial.push({ tipo: "Contabilidad", detalle: ${req.body.tipo}: $${req.body.monto} });
  await expediente.save();

  res.json({ ok: true, expediente });
});

app.get("/api/tipos", auth, async (req, res) => {
  res.json(await TipoProceso.find({ userId: req.user.id }).sort({ createdAt: -1 }));
});

app.post("/api/tipos", auth, async (req, res) => {
  const tipo = await TipoProceso.create({ ...req.body, userId: req.user.id });
  res.json({ ok: true, tipo });
});

app.delete("/api/tipos/:id", auth, async (req, res) => {
  await TipoProceso.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  res.json({ ok: true });
});

app.get("/api/modelos", auth, async (req, res) => {
  res.json(await Modelo.find({ userId: req.user.id }).sort({ createdAt: -1 }));
});

app.post("/api/modelos", auth, async (req, res) => {
  const modelo = await Modelo.create({ ...req.body, userId: req.user.id });
  res.json({ ok: true, modelo });
});

app.delete("/api/modelos/:id", auth, async (req, res) => {
  await Modelo.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Servidor corriendo en puerto " + PORT));