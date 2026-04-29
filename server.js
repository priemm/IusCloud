require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Falta MONGO_URI en variables de entorno");
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => console.error("❌ Error Mongo:", err.message));

const ClienteSchema = new mongoose.Schema(
  {
    nombre: String,
    email: String,
    telefono: String,
    domicilio: String,
    dni: String,
    observaciones: String,
  },
  { timestamps: true }
);

const ExpedienteSchema = new mongoose.Schema(
  {
    titulo: String,
    numero: String,
    juzgado: String,
    cliente: String,
    tipo: String,
    vencimiento: String,
    descripcion: String,
    presupuesto: String,
    cobrados: String,
    estado: String,
  },
  { timestamps: true }
);

const Cliente = mongoose.model("Cliente", ClienteSchema);
const Expediente = mongoose.model("Expediente", ExpedienteSchema);

app.get("/api/clientes", async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ createdAt: -1 });
    res.json(clientes);
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    res.status(500).json({ error: "Error al cargar clientes" });
  }
});

app.post("/api/clientes", async (req, res) => {
  try {
    const cliente = new Cliente(req.body);
    await cliente.save();
    res.json({ ok: true, cliente });
  } catch (error) {
    console.error("Error al guardar cliente:", error);
    res.status(500).json({ error: "Error al guardar cliente" });
  }
});

app.get("/api/expedientes", async (req, res) => {
  try {
    const expedientes = await Expediente.find().sort({ createdAt: -1 });
    res.json(expedientes);
  } catch (error) {
    console.error("Error al cargar expedientes:", error);
    res.status(500).json({ error: "Error al cargar expedientes" });
  }
});

app.post("/api/expedientes", async (req, res) => {
  try {
    const expediente = new Expediente(req.body);
    await expediente.save();
    res.json({ ok: true, expediente });
  } catch (error) {
    console.error("Error al guardar expediente:", error);
    res.status(500).json({ error: "Error al guardar expediente" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto " + PORT);
});