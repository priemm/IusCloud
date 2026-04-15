"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Vista =
  | "dashboard"
  | "clientes"
  | "expedientes"
  | "tipos_proceso"
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

const TIPOS_PROCESO_DEFAULT = [
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
];

const ESTADOS_EXPEDIENTE: EstadoExpediente[] = [
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
      'Se presenta {{cliente_nombre}}, DNI {{cliente_documento}}, con domicilio en {{cliente_domicilio}}, en los autos caratulados "{{expediente_titulo}}", Expte. N° {{expediente_numero}}, que tramitan por ante {{expediente_juzgado}}.\n\nTipo de proceso: {{expediente_tipo_proceso}}.\nEstado del expediente: {{expediente_estado}}.\n\nProveer de conformidad,\nSERÁ JUSTICIA.\n\nFecha: {{fecha_hoy}}',
  },
  {
    id: 2,
    nombre: "Pronto despacho",
    categoria: "Impulsos",
    contenido:
      'En los autos "{{expediente_titulo}}", Expte. N° {{expediente_numero}}, que tramitan por ante {{expediente_juzgado}}, vengo a solicitar se imprima pronto despacho.\n\nCliente: {{cliente_nombre}}\nTipo de proceso: {{expediente_tipo_proceso}}\n\nFecha: {{fecha_hoy}}',
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={styles.cardMini}>
      <div style={styles.labelMini}>{title}</div>
      <div style={styles.numberMini}>{value}</div>
    </div>
  );
}

export default function Home() {
  const [vista, setVista] = useState<Vista>("dashboard");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(
    null
  );
  const [nuevoCliente, setNuevoCliente] = useState(CLIENTE_VACIO);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [tiposProceso, setTiposProceso] = useState<string[]>(
    TIPOS_PROCESO_DEFAULT
  );
  const [nuevoTipoProceso, setNuevoTipoProceso] = useState("");

  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [expSeleccionado, setExpSeleccionado] = useState<Expediente | null>(null);

  const [tituloExp, setTituloExp] = useState("");
  const [numeroExp, setNumeroExp] = useState("");
  const [juzgadoExp, setJuzgadoExp] = useState("");
  const [clienteExpedienteId, setClienteExpedienteId] = useState("");
  const [tipoProcesoExp, setTipoProcesoExp] = useState(TIPOS_PROCESO_DEFAULT[0]);
  const [estadoExp, setEstadoExp] =
    useState<EstadoExpediente>("En trámite");
  const [vencimientoExp, setVencimientoExp] = useState("");
  const [honorariosPres, setHonorariosPres] = useState("");
  const [honorariosCob, setHonorariosCob] = useState("");
  const [busquedaExpediente, setBusquedaExpediente] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState<"todos" | NivelAlerta>(
    "todos"
  );

  const [textoMov, setTextoMov] = useState("");
  const [tipoMov, setTipoMov] = useState<TipoMovimiento>("tarea");
  const [fechaMov, setFechaMov] = useState("");

  const [modelos, setModelos] = useState<ModeloEscrito[]>([]);
  const [modeloSeleccionado, setModeloSeleccionado] =
    useState<ModeloEscrito | null>(null);
  const [nuevoModeloNombre, setNuevoModeloNombre] = useState("");
  const [nuevoModeloCategoria, setNuevoModeloCategoria] = useState("");
  const [nuevoModeloContenido, setNuevoModeloContenido] = useState("");
  const [modeloGeneradorId, setModeloGeneradorId] = useState("");
  const [textoGenerado, setTextoGenerado] = useState("");

  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anioActual, setAnioActual] = useState(new Date().getFullYear());
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");

  useEffect(() => {
    const clientesGuardados = localStorage.getItem("iuscloud_clientes");
    const expedientesGuardados = localStorage.getItem("iuscloud_expedientes");
    const tiposGuardados = localStorage.getItem("iuscloud_tipos_proceso");
    const modelosGuardados = localStorage.getItem("iuscloud_modelos");

    if (clientesGuardados) {
      setClientes(JSON.parse(clientesGuardados) as Cliente[]);
    }

    if (expedientesGuardados) {
      const parsed = JSON.parse(expedientesGuardados) as Expediente[];
      const migrados = parsed.map((e) => ({
        ...e,
        movimientos: Array.isArray(e.movimientos)
          ? e.movimientos.map((m) => ({
              texto: m.texto ?? "",
              tipo: (m.tipo ?? "nota") as TipoMovimiento,
              fecha: m.fecha ?? "",
              estado: (m.estado ?? "pendiente") as EstadoMovimiento,
            }))
          : [],
      }));
      setExpedientes(migrados);
    }

    if (tiposGuardados) {
      const parsed = JSON.parse(tiposGuardados) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setTiposProceso(parsed);
        setTipoProcesoExp(parsed[0]);
      }
    }

    if (modelosGuardados) {
      const parsed = JSON.parse(modelosGuardados) as ModeloEscrito[];
      setModelos(parsed.length > 0 ? parsed : MODELOS_DEFAULT);
    } else {
      setModelos(MODELOS_DEFAULT);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("iuscloud_clientes", JSON.stringify(clientes));
  }, [clientes]);

  useEffect(() => {
    localStorage.setItem("iuscloud_expedientes", JSON.stringify(expedientes));
  }, [expedientes]);

  useEffect(() => {
    localStorage.setItem("iuscloud_tipos_proceso", JSON.stringify(tiposProceso));
  }, [tiposProceso]);

  useEffect(() => {
    localStorage.setItem("iuscloud_modelos", JSON.stringify(modelos));
  }, [modelos]);

  useEffect(() => {
    if (tiposProceso.length > 0 && !tiposProceso.includes(tipoProcesoExp)) {
      setTipoProcesoExp(tiposProceso[0]);
    }
  }, [tiposProceso, tipoProcesoExp]);

  const irAVista = (nuevaVista: Vista) => {
    setVista(nuevaVista);
    setClienteSeleccionado(null);
    setExpSeleccionado(null);
    setModeloSeleccionado(null);
    setModeloGeneradorId("");
    setTextoGenerado("");
    setFechaSeleccionada("");
  };

  const hoyStr = new Date().toISOString().slice(0, 10);

  const sumarDias = (fecha: string, dias: number) => {
    const base = new Date(`${fecha}T00:00:00`);
    base.setDate(base.getDate() + dias);
    return base.toISOString().slice(0, 10);
  };

  const limiteUrgente = sumarDias(hoyStr, 3);
  const limiteProximo = sumarDias(hoyStr, 7);

  const obtenerAlerta = (exp: Expediente): NivelAlerta => {
    if (!exp.vencimiento) return "ok";
    if (exp.vencimiento < hoyStr) return "vencido";
    if (exp.vencimiento <= limiteUrgente) return "urgente";
    if (exp.vencimiento <= limiteProximo) return "proximo";
    return "ok";
  };

  const prioridad = (exp: Expediente) => {
    const alerta = obtenerAlerta(exp);
    if (alerta === "vencido") return 0;
    if (alerta === "urgente") return 1;
    if (alerta === "proximo") return 2;
    return 3;
  };

  const agregarCliente = () => {
    if (!nuevoCliente.nombre.trim()) return;

    const nuevo: Cliente = {
      id: Date.now(),
      nombre: nuevoCliente.nombre.trim(),
      telefono: nuevoCliente.telefono.trim(),
      email: nuevoCliente.email.trim(),
      documento: nuevoCliente.documento.trim(),
      domicilio: nuevoCliente.domicilio.trim(),
      observaciones: nuevoCliente.observaciones.trim(),
    };

    setClientes((prev) => [nuevo, ...prev]);
    setNuevoCliente(CLIENTE_VACIO);
  };

  const guardarClienteSeleccionado = () => {
    if (!clienteSeleccionado) return;

    setClientes((prev) =>
      prev.map((c) => (c.id === clienteSeleccionado.id ? clienteSeleccionado : c))
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
    if (tiposProceso.some((t) => t.toLowerCase() === valor.toLowerCase())) return;

    setTiposProceso((prev) => [...prev, valor].sort((a, b) => a.localeCompare(b)));
    setNuevoTipoProceso("");
  };

  const eliminarTipoProceso = (tipoAEliminar: string) => {
    if (tiposProceso.length <= 1) return;

    const enUso = expedientes.some((e) => e.tipoProceso === tipoAEliminar);
    if (enUso) {
      alert("No podés eliminar este tipo porque hay expedientes usándolo.");
      return;
    }

    setTiposProceso((prev) => prev.filter((t) => t !== tipoAEliminar));
  };

  const crearExpediente = () => {
    if (!tituloExp.trim() || !clienteExpedienteId) return;

    const clienteObj = clientes.find((c) => String(c.id) === clienteExpedienteId);
    if (!clienteObj) return;

    const nuevo: Expediente = {
      id: Date.now(),
      titulo: tituloExp.trim(),
      numero: numeroExp.trim(),
      juzgado: juzgadoExp.trim(),
      cliente: clienteObj.nombre,
      clienteId: clienteObj.id,
      tipoProceso: tipoProcesoExp,
      estadoExpediente: estadoExp,
      vencimiento: vencimientoExp,
      movimientos: [],
      honorariosPresupuestados: Number(honorariosPres || 0),
      honorariosCobrados: Number(honorariosCob || 0),
    };

    setExpedientes((prev) => [nuevo, ...prev]);

    setTituloExp("");
    setNumeroExp("");
    setJuzgadoExp("");
    setClienteExpedienteId("");
    setTipoProcesoExp(tiposProceso[0] || "");
    setEstadoExp("En trámite");
    setVencimientoExp("");
    setHonorariosPres("");
    setHonorariosCob("");
  };

  const actualizarEstadoExpediente = (estado: EstadoExpediente) => {
    if (!expSeleccionado) return;

    const actualizados = expedientes.map((e) =>
      e.id === expSeleccionado.id ? { ...e, estadoExpediente: estado } : e
    );

    setExpedientes(actualizados);
    setExpSeleccionado(actualizados.find((e) => e.id === expSeleccionado.id) ?? null);
  };

  const actualizarHonorariosExpediente = (
    campo: "honorariosPresupuestados" | "honorariosCobrados",
    valor: string
  ) => {
    if (!expSeleccionado) return;

    const actualizados = expedientes.map((e) =>
      e.id === expSeleccionado.id ? { ...e, [campo]: Number(valor || 0) } : e
    );

    setExpedientes(actualizados);
    setExpSeleccionado(actualizados.find((e) => e.id === expSeleccionado.id) ?? null);
  };

  const agregarMovimiento = () => {
    if (!expSeleccionado || !textoMov.trim() || !fechaMov) return;

    const nuevo: Movimiento = {
      texto: textoMov.trim(),
      tipo: tipoMov,
      fecha: fechaMov,
      estado: "pendiente",
    };

    const actualizados = expedientes.map((e) =>
      e.id === expSeleccionado.id
        ? { ...e, movimientos: [...e.movimientos, nuevo] }
        : e
    );

    setExpedientes(actualizados);
    setExpSeleccionado(actualizados.find((e) => e.id === expSeleccionado.id) ?? null);

    setTextoMov("");
    setTipoMov("tarea");
    setFechaMov("");
  };

  const toggleEstadoMovimiento = (index: number) => {
    if (!expSeleccionado) return;

    const actualizados = expedientes.map((e) => {
      if (e.id !== expSeleccionado.id) return e;

      return {
        ...e,
        movimientos: e.movimientos.map((m, i) =>
          i === index
            ? {
                ...m,
                estado: m.estado === "pendiente" ? "hecho" : "pendiente",
              }
            : m
        ),
      };
    });

    setExpedientes(actualizados);
    setExpSeleccionado(actualizados.find((e) => e.id === expSeleccionado.id) ?? null);
  };

  const agregarModelo = () => {
    if (!nuevoModeloNombre.trim() || !nuevoModeloContenido.trim()) return;

    const nuevo: ModeloEscrito = {
      id: Date.now(),
      nombre: nuevoModeloNombre.trim(),
      categoria: nuevoModeloCategoria.trim() || "General",
      contenido: nuevoModeloContenido,
    };

    setModelos((prev) => [nuevo, ...prev]);
    setNuevoModeloNombre("");
    setNuevoModeloCategoria("");
    setNuevoModeloContenido("");
  };

  const guardarModeloSeleccionado = () => {
    if (!modeloSeleccionado) return;

    setModelos((prev) =>
      prev.map((m) => (m.id === modeloSeleccionado.id ? modeloSeleccionado : m))
    );
  };

  const eliminarModelo = (id: number) => {
    setModelos((prev) => prev.filter((m) => m.id !== id));
    if (modeloSeleccionado?.id === id) setModeloSeleccionado(null);
  };

  const reemplazarVariables = (contenido: string, exp: Expediente) => {
    const cliente = clientes.find((c) => c.id === exp.clienteId);

    const variables: Record<string, string> = {
      cliente_nombre: cliente?.nombre ?? exp.cliente ?? "",
      cliente_telefono: cliente?.telefono ?? "",
      cliente_email: cliente?.email ?? "",
      cliente_documento: cliente?.documento ?? "",
      cliente_domicilio: cliente?.domicilio ?? "",
      cliente_observaciones: cliente?.observaciones ?? "",
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

    const resultado = reemplazarVariables(modelo.contenido, expSeleccionado);
    setTextoGenerado(resultado);
  };

  const copiarTextoGenerado = async () => {
    if (!textoGenerado) return;
    try {
      await navigator.clipboard.writeText(textoGenerado);
      alert("Texto copiado.");
    } catch {
      alert("No se pudo copiar.");
    }
  };

  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q) return clientes;

    return clientes.filter((c) =>
      [c.nombre, c.email, c.telefono, c.documento, c.domicilio, c.observaciones]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [clientes, busquedaCliente]);

  const expedientesFiltrados = useMemo(() => {
    const q = busquedaExpediente.trim().toLowerCase();

    const base = expedientes.filter((e) => {
      const alerta = obtenerAlerta(e);

      const coincideBusqueda = !q
        ? true
        : [
            e.titulo,
            e.numero,
            e.juzgado,
            e.cliente,
            e.tipoProceso,
            e.estadoExpediente,
            e.vencimiento || "",
            textoAlerta(alerta),
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);

      const coincideFiltro = filtroAlerta === "todos" ? true : alerta === filtroAlerta;
      return coincideBusqueda && coincideFiltro;
    });

    return base.sort((a, b) => {
      const pa = prioridad(a);
      const pb = prioridad(b);
      if (pa !== pb) return pa - pb;

      const fa = a.vencimiento || "9999-12-31";
      const fb = b.vencimiento || "9999-12-31";
      if (fa !== fb) return fa.localeCompare(fb);

      return a.titulo.localeCompare(b.titulo);
    });
  }, [expedientes, busquedaExpediente, filtroAlerta]);

  const expedientesDelCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];
    return expedientes.filter((e) => e.clienteId === clienteSeleccionado.id);
  }, [clienteSeleccionado, expedientes]);

  const urgentesCount = useMemo(
    () =>
      expedientes.filter((e) => {
        const alerta = obtenerAlerta(e);
        return alerta === "urgente" || alerta === "vencido";
      }).length,
    [expedientes]
  );

  const proximosCount = useMemo(
    () => expedientes.filter((e) => obtenerAlerta(e) === "proximo").length,
    [expedientes]
  );

  const honorariosTotales = useMemo(
    () => expedientes.reduce((acc, e) => acc + e.honorariosPresupuestados, 0),
    [expedientes]
  );

  const honorariosCobradosTotales = useMemo(
    () => expedientes.reduce((acc, e) => acc + e.honorariosCobrados, 0),
    [expedientes]
  );

  const agendaItems = useMemo(() => {
    const items: AgendaItem[] = [];

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

  const proximosEventos = agendaItems.slice(0, 5);

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
        setAnioActual((prev) => prev + 1);
      } else {
        setMesActual((prev) => prev + 1);
      }
    }
  };

  const nombreMes = new Date(anioActual, mesActual).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brandBox}>
            <div style={styles.brandIcon}>IC</div>
            <div>
              <div style={styles.brandTitle}>IusCloud</div>
              <div style={styles.brandSubtitle}>Jurídico + Escritos</div>
            </div>
          </div>

          <nav style={{ marginTop: 24 }}>
            <SidebarButton active={vista === "dashboard"} onClick={() => irAVista("dashboard")}>
              Dashboard
            </SidebarButton>
            <SidebarButton active={vista === "clientes"} onClick={() => irAVista("clientes")}>
              Clientes
            </SidebarButton>
            <SidebarButton active={vista === "expedientes"} onClick={() => irAVista("expedientes")}>
              Expedientes
            </SidebarButton>
            <SidebarButton active={vista === "tipos_proceso"} onClick={() => irAVista("tipos_proceso")}>
              Tipos de Proceso
            </SidebarButton>
            <SidebarButton active={vista === "modelos"} onClick={() => irAVista("modelos")}>
              Modelos de escrito
            </SidebarButton>
          </nav>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30 }}>IusCloud ⚖️</h1>
            <p style={{ marginTop: 6, color: "#64748b" }}>
              Gestión jurídica con plantillas automáticas
            </p>
          </div>
        </div>

        {vista === "dashboard" && (
          <>
            <div style={styles.statsGrid}>
              <StatCard title="Clientes" value={clientes.length} />
              <StatCard title="Expedientes" value={expedientes.length} />
              <StatCard title="Urgentes / vencidos" value={urgentesCount} />
              <StatCard title="Próximos a vencer" value={proximosCount} />
            </div>

            <div style={styles.twoCols}>
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>Próximos eventos</h2>
                {proximosEventos.length === 0 ? (
                  <p style={styles.muted}>No hay eventos cargados.</p>
                ) : (
                  proximosEventos.map((item, i) => (
                    <div key={i} style={styles.agendaItem}>
                      <div style={{ fontWeight: 700, color: colorEvento(item.tipo) }}>
                        {item.tipo.toUpperCase()} — {item.fecha}
                      </div>
                      <div style={{ marginTop: 4 }}>{item.texto}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {item.expedienteTitulo} — {item.cliente}
                      </div>
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
                  setNuevoCliente({ ...nuevoCliente, email: e.target.value })
                }
                style={styles.input}
              />
              <input
                placeholder="DNI / CUIT"
                value={nuevoCliente.documento}
                onChange={(e) =>
                  setNuevoCliente({ ...nuevoCliente, documento: e.target.value })
                }
                style={styles.input}
              />
              <input
                placeholder="Domicilio"
                value={nuevoCliente.domicilio}
                onChange={(e) =>
                  setNuevoCliente({ ...nuevoCliente, domicilio: e.target.value })
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
                      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                        {c.email || "Sin email"} · {c.telefono || "Sin teléfono"}
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
            <button style={styles.btnGhost} onClick={() => setClienteSeleccionado(null)}>
              ← Volver
            </button>

            <h2 style={{ marginTop: 16 }}>Ficha del cliente</h2>

            <div style={styles.fichaGrid}>
              <div style={styles.fichaBox}>
                <div style={styles.fichaLabel}>Nombre</div>
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
              </div>
              <div style={styles.fichaBox}>
                <div style={styles.fichaLabel}>Teléfono</div>
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
              </div>
              <div style={styles.fichaBox}>
                <div style={styles.fichaLabel}>Email</div>
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
              </div>
              <div style={styles.fichaBox}>
                <div style={styles.fichaLabel}>Documento</div>
                <input
                  value={clienteSeleccionado.documento}
                  onChange={(e) =>
                    setClienteSeleccionado({
                      ...clienteSeleccionado,
                      documento: e.target.value,
                    })
                  }
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.fichaBox, gridColumn: "1 / -1" }}>
                <div style={styles.fichaLabel}>Domicilio</div>
                <input
                  value={clienteSeleccionado.domicilio}
                  onChange={(e) =>
                    setClienteSeleccionado({
                      ...clienteSeleccionado,
                      domicilio: e.target.value,
                    })
                  }
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.fichaBox, gridColumn: "1 / -1" }}>
                <div style={styles.fichaLabel}>Observaciones</div>
                <textarea
                  value={clienteSeleccionado.observaciones}
                  onChange={(e) =>
                    setClienteSeleccionado({
                      ...clienteSeleccionado,
                      observaciones: e.target.value,
                    })
                  }
                  style={styles.textarea}
                />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button style={styles.btn} onClick={guardarClienteSeleccionado}>
                Guardar cambios
              </button>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3>Expedientes del cliente</h3>
              {expedientesDelCliente.length === 0 ? (
                <p style={styles.muted}>Este cliente no tiene expedientes cargados.</p>
              ) : (
                expedientesDelCliente.map((exp) => (
                  <div key={exp.id} style={styles.itemBase}>
                    <div>
                      <strong>{exp.titulo}</strong>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                        {exp.numero} · {exp.juzgado}
                      </div>
                    </div>
                    <button
                      style={styles.btnSmall}
                      onClick={() => {
                        setVista("expedientes");
                        setExpSeleccionado(exp);
                      }}
                    >
                      Ver expediente
                    </button>
                  </div>
                ))
              )}
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
                {clientes.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <select
                value={tipoProcesoExp}
                onChange={(e) => setTipoProcesoExp(e.target.value)}
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
                onChange={(e) => setEstadoExp(e.target.value as EstadoExpediente)}
                style={styles.input}
              >
                {ESTADOS_EXPEDIENTE.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={vencimientoExp}
                onChange={(e) => setVencimientoExp(e.target.value)}
                style={styles.input}
              />
              <input
                placeholder="Honorarios presupuestados"
                value={honorariosPres}
                onChange={(e) => setHonorariosPres(e.target.value.replace(/[^\d]/g, ""))}
                style={styles.input}
              />
              <input
                placeholder="Honorarios cobrados"
                value={honorariosCob}
                onChange={(e) => setHonorariosCob(e.target.value.replace(/[^\d]/g, ""))}
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
                value={busquedaExpediente}
                onChange={(e) => setBusquedaExpediente(e.target.value)}
                style={{ ...styles.input, width: "100%", marginBottom: 12 }}
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <button
                  style={chipFiltro(filtroAlerta === "todos")}
                  onClick={() => setFiltroAlerta("todos")}
                >
                  Todos
                </button>
                <button
                  style={chipFiltro(filtroAlerta === "vencido", "vencido")}
                  onClick={() => setFiltroAlerta("vencido")}
                >
                  Vencidos
                </button>
                <button
                  style={chipFiltro(filtroAlerta === "urgente", "urgente")}
                  onClick={() => setFiltroAlerta("urgente")}
                >
                  Urgentes
                </button>
                <button
                  style={chipFiltro(filtroAlerta === "proximo", "proximo")}
                  onClick={() => setFiltroAlerta("proximo")}
                >
                  Próximos
                </button>
                <button
                  style={chipFiltro(filtroAlerta === "ok", "ok")}
                  onClick={() => setFiltroAlerta("ok")}
                >
                  Normales
                </button>
              </div>

              {expedientesFiltrados.length === 0 ? (
                <p style={styles.muted}>No hay expedientes cargados.</p>
              ) : (
                expedientesFiltrados.map((exp) => {
                  const alerta = obtenerAlerta(exp);

                  return (
                    <div key={exp.id} style={itemConAlerta(alerta)}>
                      <div>
                        <strong>{exp.titulo}</strong>
                        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                          {exp.numero && <>N°: {exp.numero} · </>}
                          {exp.juzgado && <>Juzgado: {exp.juzgado} · </>}
                          {exp.cliente} · {exp.tipoProceso}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={badgeEstado(exp.estadoExpediente)}>
                            {exp.estadoExpediente}
                          </span>
                          {alerta !== "ok" && (
                            <span style={badgeAlerta(alerta)}>
                              {textoAlerta(alerta)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        style={styles.btnSmall}
                        onClick={() => {
                          setExpSeleccionado(exp);
                          setModeloGeneradorId("");
                          setTextoGenerado("");
                        }}
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
            <button style={styles.btnGhost} onClick={() => setExpSeleccionado(null)}>
              ← Volver
            </button>

            <h2 style={{ marginTop: 16 }}>{expSeleccionado.titulo}</h2>
            <div style={{ marginBottom: 4 }}>
              Número: <strong>{expSeleccionado.numero || "-"}</strong>
            </div>
            <div style={{ marginBottom: 4 }}>
              Juzgado: <strong>{expSeleccionado.juzgado || "-"}</strong>
            </div>
            <div style={{ marginBottom: 4 }}>
              Cliente: <strong>{expSeleccionado.cliente}</strong>
            </div>
            <div style={{ marginBottom: 10 }}>
              Tipo de proceso: <strong>{expSeleccionado.tipoProceso}</strong>
            </div>

            <div style={{ marginBottom: 16, maxWidth: 260 }}>
              <label style={styles.fichaLabel}>Cambiar estado</label>
              <select
                value={expSeleccionado.estadoExpediente}
                onChange={(e) =>
                  actualizarEstadoExpediente(e.target.value as EstadoExpediente)
                }
                style={styles.input}
              >
                {ESTADOS_EXPEDIENTE.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.cardInner}>
              <h3>Honorarios</h3>
              <div style={styles.formGrid}>
                <div>
                  <div style={styles.fichaLabel}>Presupuestados</div>
                  <input
                    value={String(expSeleccionado.honorariosPresupuestados || 0)}
                    onChange={(e) =>
                      actualizarHonorariosExpediente(
                        "honorariosPresupuestados",
                        e.target.value.replace(/[^\d]/g, "")
                      )
                    }
                    style={styles.input}
                  />
                </div>
                <div>
                  <div style={styles.fichaLabel}>Cobrados</div>
                  <input
                    value={String(expSeleccionado.honorariosCobrados || 0)}
                    onChange={(e) =>
                      actualizarHonorariosExpediente(
                        "honorariosCobrados",
                        e.target.value.replace(/[^\d]/g, "")
                      )
                    }
                    style={styles.input}
                  />
                </div>
              </div>
            </div>

            <div style={styles.cardInner}>
              <h3>Nuevo movimiento</h3>
              <div style={styles.rowWrap}>
                <input
                  placeholder="Descripción"
                  value={textoMov}
                  onChange={(e) => setTextoMov(e.target.value)}
                  style={styles.input}
                />
                <input
                  type="date"
                  value={fechaMov}
                  onChange={(e) => setFechaMov(e.target.value)}
                  style={styles.input}
                />
                <select
                  value={tipoMov}
                  onChange={(e) => setTipoMov(e.target.value as TipoMovimiento)}
                  style={styles.input}
                >
                  <option value="tarea">Tarea</option>
                  <option value="vencimiento">Vencimiento</option>
                  <option value="nota">Nota</option>
                </select>
                <button style={styles.btn} onClick={agregarMovimiento}>
                  Agregar
                </button>
              </div>

              <div style={{ marginTop: 18 }}>
                <h4 style={{ marginBottom: 10 }}>Línea de tiempo</h4>
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
                        {m.estado === "pendiente" ? "Marcar hecho" : "Marcar pendiente"}
                      </button>
                    </div>
                  ))
                )}
              </div>
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

                <button style={styles.btnGhost} onClick={copiarTextoGenerado}>
                  Copiar
                </button>
              </div>

              <div style={{ marginTop: 12, fontSize: 13, color: "#475569" }}>
                Variables disponibles: {"{{cliente_nombre}}"}, {"{{cliente_documento}}"},{" "}
                {"{{cliente_domicilio}}"}, {"{{cliente_email}}"},{" "}
                {"{{expediente_titulo}}"}, {"{{expediente_numero}}"},{" "}
                {"{{expediente_juzgado}}"}, {"{{expediente_tipo_proceso}}"},{" "}
                {"{{expediente_estado}}"}, {"{{expediente_vencimiento}}"},{" "}
                {"{{fecha_hoy}}"}
              </div>

              <textarea
                value={textoGenerado}
                onChange={(e) => setTextoGenerado(e.target.value)}
                placeholder="Acá se genera el escrito..."
                style={{ ...styles.textarea, minHeight: 260, marginTop: 14 }}
              />
            </div>
          </div>
        )}

        {vista === "tipos_proceso" && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Tipos de proceso</h2>

            <div style={styles.rowWrap}>
              <input
                placeholder="Nuevo tipo de proceso"
                value={nuevoTipoProceso}
                onChange={(e) => setNuevoTipoProceso(e.target.value)}
                style={styles.input}
              />
              <button style={styles.btn} onClick={agregarTipoProceso}>
                Agregar
              </button>
            </div>

            <div style={{ marginTop: 24 }}>
              {tiposProceso.map((tipoItem) => (
                <div key={tipoItem} style={styles.itemBase}>
                  <div>
                    <strong>{tipoItem}</strong>
                  </div>
                  <button
                    style={styles.btnDanger}
                    onClick={() => eliminarTipoProceso(tipoItem)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === "modelos" && !modeloSeleccionado && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Modelos de escrito</h2>

            <div style={styles.formGrid}>
              <input
                placeholder="Nombre del modelo"
                value={nuevoModeloNombre}
                onChange={(e) => setNuevoModeloNombre(e.target.value)}
                style={styles.input}
              />
              <input
                placeholder="Categoría"
                value={nuevoModeloCategoria}
                onChange={(e) => setNuevoModeloCategoria(e.target.value)}
                style={styles.input}
              />
              <textarea
                placeholder="Contenido del modelo con variables..."
                value={nuevoModeloContenido}
                onChange={(e) => setNuevoModeloContenido(e.target.value)}
                style={{ ...styles.textarea, gridColumn: "1 / -1", minHeight: 220 }}
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#475569" }}>
              Variables disponibles: {"{{cliente_nombre}}"}, {"{{cliente_documento}}"},{" "}
              {"{{cliente_domicilio}}"}, {"{{cliente_email}}"},{" "}
              {"{{expediente_titulo}}"}, {"{{expediente_numero}}"},{" "}
              {"{{expediente_juzgado}}"}, {"{{expediente_tipo_proceso}}"},{" "}
              {"{{expediente_estado}}"}, {"{{expediente_vencimiento}}"},{" "}
              {"{{fecha_hoy}}"}
            </div>

            <div style={{ marginTop: 12 }}>
              <button style={styles.btn} onClick={agregarModelo}>
                Agregar modelo
              </button>
            </div>

            <div style={{ marginTop: 24 }}>
              {modelos.map((m) => (
                <div key={m.id} style={styles.itemBase}>
                  <div>
                    <strong>{m.nombre}</strong>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      {m.categoria}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={styles.btnSmall}
                      onClick={() => setModeloSeleccionado(m)}
                    >
                      Editar
                    </button>
                    <button
                      style={styles.btnDanger}
                      onClick={() => eliminarModelo(m.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === "modelos" && modeloSeleccionado && (
          <div style={styles.card}>
            <button style={styles.btnGhost} onClick={() => setModeloSeleccionado(null)}>
              ← Volver
            </button>

            <h2 style={{ marginTop: 16 }}>Editar modelo</h2>

            <div style={styles.formGrid}>
              <input
                value={modeloSeleccionado.nombre}
                onChange={(e) =>
                  setModeloSeleccionado({
                    ...modeloSeleccionado,
                    nombre: e.target.value,
                  })
                }
                style={styles.input}
              />
              <input
                value={modeloSeleccionado.categoria}
                onChange={(e) =>
                  setModeloSeleccionado({
                    ...modeloSeleccionado,
                    categoria: e.target.value,
                  })
                }
                style={styles.input}
              />
              <textarea
                value={modeloSeleccionado.contenido}
                onChange={(e) =>
                  setModeloSeleccionado({
                    ...modeloSeleccionado,
                    contenido: e.target.value,
                  })
                }
                style={{ ...styles.textarea, gridColumn: "1 / -1", minHeight: 280 }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <button style={styles.btn} onClick={guardarModeloSeleccionado}>
                Guardar cambios
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function badgeEstado(estado: EstadoExpediente): CSSProperties {
  const colores: Record<EstadoExpediente, { fondo: string; texto: string }> = {
    "En trámite": { fondo: "#dbeafe", texto: "#1d4ed8" },
    Pendiente: { fondo: "#fef3c7", texto: "#b45309" },
    Urgente: { fondo: "#fee2e2", texto: "#b91c1c" },
    Archivado: { fondo: "#e5e7eb", texto: "#374151" },
    Finalizado: { fondo: "#dcfce7", texto: "#166534" },
  };

  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: colores[estado].fondo,
    color: colores[estado].texto,
  };
}

function badgeAlerta(alerta: NivelAlerta): CSSProperties {
  if (alerta === "vencido") {
    return {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#fee2e2",
      color: "#b91c1c",
    };
  }

  if (alerta === "urgente") {
    return {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#ffedd5",
      color: "#c2410c",
    };
  }

  if (alerta === "proximo") {
    return {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: "#fef3c7",
      color: "#a16207",
    };
  }

  return {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: "#dcfce7",
    color: "#166534",
  };
}

function itemConAlerta(alerta: NivelAlerta): CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 14,
    border:
      alerta === "vencido"
        ? "1px solid #fca5a5"
        : alerta === "urgente"
        ? "1px solid #fdba74"
        : alerta === "proximo"
        ? "1px solid #fde68a"
        : "1px solid #e5e7eb",
    borderRadius: 12,
    marginBottom: 10,
    background:
      alerta === "vencido"
        ? "#fff5f5"
        : alerta === "urgente"
        ? "#fff7ed"
        : alerta === "proximo"
        ? "#fffbeb"
        : "#fafafa",
  };
}

function chipFiltro(
  activo: boolean,
  alerta?: "ok" | "proximo" | "urgente" | "vencido"
): CSSProperties {
  const colores =
    alerta === "vencido"
      ? { fondo: "#fee2e2", texto: "#b91c1c", borde: "#fca5a5" }
      : alerta === "urgente"
      ? { fondo: "#ffedd5", texto: "#c2410c", borde: "#fdba74" }
      : alerta === "proximo"
      ? { fondo: "#fef3c7", texto: "#a16207", borde: "#fde68a" }
      : alerta === "ok"
      ? { fondo: "#f3f4f6", texto: "#374151", borde: "#d1d5db" }
      : { fondo: "#e0e7ff", texto: "#3730a3", borde: "#c7d2fe" };

  return {
    border: `1px solid ${colores.borde}`,
    background: activo ? colores.fondo : "white",
    color: colores.texto,
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
  };
}

const styles: Record<string, CSSProperties> = {
  layout: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    minHeight: "100vh",
    background: "#f4f6f8",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    background: "#0f172a",
    color: "white",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  brandTitle: {
    fontWeight: 700,
    fontSize: 18,
  },
  brandSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
  },
  main: {
    padding: 30,
  },
  topbar: {
    marginBottom: 24,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  twoCols: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr",
    gap: 20,
  },
  cardMini: {
    background: "white",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  labelMini: {
    fontSize: 13,
    color: "#666",
  },
  numberMini: {
    fontSize: 28,
    fontWeight: 700,
    marginTop: 8,
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  cardInner: {
    background: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    border: "1px solid #e5e7eb",
  },
  sectionTitle: {
    margin: 0,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  fichaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  fichaBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
  },
  fichaLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 6,
    fontWeight: 700,
  },
  rowWrap: {
    display: "flex",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  input: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    flex: 1,
    minWidth: 160,
    boxSizing: "border-box",
    background: "white",
  },
  textarea: {
    width: "100%",
    minHeight: 100,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
    resize: "vertical",
    background: "white",
  },
  btn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  btnSmall: {
    background: "#111827",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
  },
  btnDanger: {
    background: "#b91c1c",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
  },
  btnGhost: {
    background: "white",
    color: "#111827",
    border: "1px solid #cbd5e1",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
  },
  itemBase: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    marginBottom: 10,
    background: "#fafafa",
  },
  muted: {
    color: "#64748b",
  },
  agendaItem: {
    padding: 12,
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    marginBottom: 10,
  },
  summaryLine: {
    padding: "10px 0",
    borderBottom: "1px solid #e5e7eb",
  },
};
