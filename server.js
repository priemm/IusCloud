require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
    proveedor: { type: String, default: "local" }
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
    observaciones: String
  },
  { timestamps: true }
);

const ExpedienteSchema = new mongoose.Schema(
  {
    userId: String,
    titulo: String,
    numero: String,
    juzgado: String,
    cliente: String,
    tipo: String,
    vencimiento: String,
    tarea: String,
    descripcion: String,
    presupuesto: String,
    cobrados: String,
    estado: String
  },
  { timestamps: true }
);

const TipoProcesoSchema = new mongoose.Schema(
  {
    userId: String,
    nombre: String,
    descripcion: String
  },
  { timestamps: true }
);

const ModeloSchema = new mongoose.Schema(
  {
    userId: String,
    titulo: String,
    tipo: String,
    contenido: String
  },
  { timestamps: true }
);

const Usuario = mongoose.model("Usuario", UsuarioSchema);
const Cliente = mongoose.model("Cliente", ClienteSchema);
const Expediente = mongoose.model("Expediente", ExpedienteSchema);
const TipoProceso = mongoose.model("TipoProceso", TipoProcesoSchema);
const Modelo = mongoose.model("Modelo", ModeloSchema);

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");

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

    if (!email || !password) {
      return res.status(400).json({ error: "Email y clave son obligatorios" });
    }

    const existe = await Usuario.findOne({ email });
    if (existe) return res.status(400).json({ error: "Ese email ya existe" });

    const hash = await bcrypt.hash(password, 10);

    const usuario = await Usuario.create({
      nombre,
      email,
      password: hash,
      estudio: estudio || "Mi estudio jurídico"
    });

    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, estudio: usuario.estudio },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ ok: true, token, usuario: { nombre, email, estudio: usuario.estudio } });
  } catch (err) {
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

    res.json({
      ok: true,
      token,
      usuario: {
        nombre: usuario.nombre,
        email: usuario.email,
        estudio: usuario.estudio
      }
    });
  } catch {
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

app.get("/api/auth/google", (req, res) => {
  res.status(501).json({
    error: "Google Login requiere configurar Google Cloud OAuth"
  });
});

app.get("/api/dashboard", auth, async (req, res) => {
  const userId = req.user.id;

  const clientes = await Cliente.countDocuments({ userId });
  const expedientes = await Expediente.countDocuments({ userId });
  const tipos = await TipoProceso.countDocuments({ userId });
  const modelos = await Modelo.countDocuments({ userId });

  res.json({ clientes, expedientes, tipos, modelos });
});

app.get("/api/clientes", auth, async (req, res) => {
  const q = req.query.q || "";
  const filtro = {
    userId: req.user.id,
    ...(q
      ? {
          $or: [
            { nombre: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { dni: { $regex: q, $options: "i" } },
            { telefono: { $regex: q, $options: "i" } }
          ]
        }
      : {})
  };

  const clientes = await Cliente.find(filtro).sort({ createdAt: -1 });
  res.json(clientes);
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
  const expedientes = await Expediente.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(expedientes);
});

app.post("/api/expedientes", auth, async (req, res) => {
  const expediente = await Expediente.create({ ...req.body, userId: req.user.id });
  res.json({ ok: true, expediente });
});

app.delete("/api/expedientes/:id", auth, async (req, res) => {
  await Expediente.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  res.json({ ok: true });
});

app.get("/api/tipos", auth, async (req, res) => {
  const tipos = await TipoProceso.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(tipos);
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
  const modelos = await Modelo.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(modelos);
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