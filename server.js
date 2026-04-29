require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error Mongo:", err));

// Schema Cliente
const ClienteSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  telefono: String,
  domicilio: String,
  dni: String,
  observaciones: String
});

const Cliente = mongoose.model("Cliente", ClienteSchema);

// Ruta para guardar cliente
app.post("/api/clientes", async (req, res) => {
  try {
    const cliente = new Cliente(req.body);
    await cliente.save();
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar cliente" });
  }
});

// Ruta para listar clientes
app.get("/api/clientes", async (req, res) => {
  const clientes = await Cliente.find();
  res.json(clientes);
});

// Levantar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto " + PORT);
});