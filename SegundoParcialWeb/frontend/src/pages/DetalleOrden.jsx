import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  actualizarRegistro,
  obtenerRegistro,
  obtenerRegistros,
  urlArchivo,
} from "../services/pocketbase";
import {
  ETIQUETAS_ACCION,
  TRANSICIONES,
  etiquetaEstado,
} from "../estados";

function DetalleOrden() {
  const { id } = useParams();

  const [orden, setOrden] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [mostrandoPresupuesto, setMostrandoPresupuesto] = useState(false);
  const [diagnostico, setDiagnostico] = useState("");
  const [manoObra, setManoObra] = useState("");
  const [piezas, setPiezas] = useState([
    { descripcion: "", cantidad: 1, precio: "" },
  ]);

  const cargarDatos = useCallback(
    async (signal) => {
      const [datosOrden, datosEventos] = await Promise.all([
        obtenerRegistro("ordenes", id, { expand: "cliente", signal }),
        obtenerRegistros("eventos", {
          filter: `orden = "${id}"`,
          sort: "created",
          signal,
        }),
      ]);

      return { datosOrden, datosEventos };
    },
    [id]
  );

  useEffect(() => {
    const controlador = new AbortController();

    async function cargar() {
      setCargando(true);
      setError("");

      try {
        const { datosOrden, datosEventos } = await cargarDatos(
          controlador.signal
        );
        setOrden(datosOrden);
        setEventos(datosEventos);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "No se pudo cargar la orden.");
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => controlador.abort();
  }, [id, cargarDatos]);

  async function recargar() {
    const { datosOrden, datosEventos } = await cargarDatos();
    setOrden(datosOrden);
    setEventos(datosEventos);
  }

  async function avanzar(estadoNuevo) {
    setEnviando(true);
    setError("");
    setMensaje("");

    try {
      await actualizarRegistro("ordenes", id, { estado: estadoNuevo });
      await recargar();
      setMensaje("Etapa actualizada correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function guardarPresupuesto(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError("");

    try {
      if (!diagnostico.trim()) {
        throw new Error("El diagnóstico es obligatorio.");
      }

      const piezasLimpias = piezas
        .filter((p) => p.descripcion.trim())
        .map((p) => ({
          descripcion: p.descripcion.trim(),
          cantidad: Number(p.cantidad) || 0,
          precio: Number(p.precio) || 0,
        }));

      await actualizarRegistro("ordenes", id, {
        estado: "presupuestada",
        diagnostico: diagnostico.trim(),
        manoObra: Number(manoObra) || 0,
        piezas: piezasLimpias,
      });

      setMostrandoPresupuesto(false);
      await recargar();
      setMensaje("Presupuesto registrado.");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function cambiarPieza(indice, campo, valor) {
    const copia = piezas.map((pieza, i) =>
      i === indice ? { ...pieza, [campo]: valor } : pieza
    );
    setPiezas(copia);
  }

  function agregarPieza() {
    setPiezas([...piezas, { descripcion: "", cantidad: 1, precio: "" }]);
  }

  function quitarPieza(indice) {
    setPiezas(piezas.filter((_, i) => i !== indice));
  }

  function formatearFecha(fecha) {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (cargando) {
    return (
      <div className="empty-state">
        <h3>Cargando orden...</h3>
      </div>
    );
  }

  if (error && !orden) {
    return (
      <div className="empty-state">
        <h3>No se pudo cargar la orden</h3>
        <p>{error}</p>
        <Link to="/ordenes">Volver a órdenes</Link>
      </div>
    );
  }

  if (!orden) {
    return null;
  }

  const cliente = orden?.expand?.cliente;
  const piezasGuardadas = Array.isArray(orden.piezas) ? orden.piezas : [];
  const totalPresupuesto =
    (orden.manoObra || 0) +
    piezasGuardadas.reduce(
      (suma, p) => suma + (p.cantidad || 0) * (p.precio || 0),
      0
    );

  const siguientes = TRANSICIONES[orden.estado] || [];
  const cerrada = ["rechazada", "cancelada", "entregada"].includes(
    orden.estado
  );

  return (
    <div className="detalle-orden">
      <div className="ordenes-heading">
        <div>
          <h2>Detalle de la orden</h2>
          <p>
            Equipo: <strong>{orden.equipo}</strong>
          </p>
        </div>

        <Link to="/ordenes" className="btn-secondary">
          ← Volver a órdenes
        </Link>
      </div>

      <div className="detalle-grid">
        <section className="detalle-card">
          <h3>Información general</h3>

          <dl className="detalle-datos">
            <div>
              <dt>Cliente</dt>
              <dd>{cliente?.nombre || "—"}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{cliente?.telefono || "—"}</dd>
            </div>
            <div>
              <dt>Problema</dt>
              <dd>{orden.problema}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <span className={`estado estado-${orden.estado}`}>
                  {etiquetaEstado(orden.estado)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Registrada</dt>
              <dd>{formatearFecha(orden.created)}</dd>
            </div>
          </dl>

          {orden.fotos?.length > 0 && (
            <div className="detalle-fotos">
              {orden.fotos.map((foto) => (
                <a
                  key={foto}
                  href={urlArchivo("ordenes", orden.id, foto)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={urlArchivo("ordenes", orden.id, foto)}
                    alt={`Foto de ${orden.equipo}`}
                  />
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="detalle-card">
          <h3>Presupuesto</h3>

          {piezasGuardadas.length > 0 || orden.diagnostico ? (
            <>
              <p className="detalle-diagnostico">{orden.diagnostico}</p>

              <table className="piezas-table">
                <thead>
                  <tr>
                    <th>Pieza</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {piezasGuardadas.map((pieza, i) => (
                    <tr key={i}>
                      <td>{pieza.descripcion}</td>
                      <td>{pieza.cantidad}</td>
                      <td>${pieza.precio}</td>
                      <td>${(pieza.cantidad || 0) * (pieza.precio || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="presupuesto-total">
                <span>Mano de obra: ${orden.manoObra || 0}</span>
                <strong>Total: ${totalPresupuesto}</strong>
              </div>
            </>
          ) : (
            <p className="detalle-vacio">
              Aún no hay presupuesto para esta orden.
            </p>
          )}
        </section>
      </div>

      {mostrandoPresupuesto && (
        <form className="orden-form" onSubmit={guardarPresupuesto}>
          <h3>Registrar presupuesto</h3>

          <label className="form-field">
            <span>Diagnóstico</span>
            <textarea
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              rows="3"
              placeholder="Qué se encontró al revisar el equipo"
            />
          </label>

          <label className="form-field">
            <span>Mano de obra</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={manoObra}
              onChange={(e) => setManoObra(e.target.value)}
            />
          </label>

          <div className="piezas-editor">
            <h4>Piezas</h4>

            {piezas.map((pieza, i) => (
              <div className="form-row" key={i}>
                <label className="form-field">
                  <span>Descripción</span>
                  <input
                    type="text"
                    value={pieza.descripcion}
                    onChange={(e) =>
                      cambiarPieza(i, "descripcion", e.target.value)
                    }
                  />
                </label>

                <label className="form-field form-field-corto">
                  <span>Cantidad</span>
                  <input
                    type="number"
                    min="1"
                    value={pieza.cantidad}
                    onChange={(e) =>
                      cambiarPieza(i, "cantidad", e.target.value)
                    }
                  />
                </label>

                <label className="form-field form-field-corto">
                  <span>Precio</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pieza.precio}
                    onChange={(e) => cambiarPieza(i, "precio", e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  className="btn-quitar"
                  onClick={() => quitarPieza(i)}
                  disabled={piezas.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn-secondary"
              onClick={agregarPieza}
            >
              + Agregar pieza
            </button>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMostrandoPresupuesto(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={enviando}>
              {enviando ? "Guardando..." : "Guardar presupuesto"}
            </button>
          </div>
        </form>
      )}

      <section className="detalle-card">
        <h3>Historial</h3>

        {eventos.length === 0 ? (
          <p className="detalle-vacio">
            Todavía no hay cambios de etapa registrados.
          </p>
        ) : (
          <ul className="historial">
            {eventos.map((evento) => (
              <li key={evento.id}>
                <span className="historial-flecha">→</span>
                <div>
                  <strong>{etiquetaEstado(evento.de)}</strong> →{" "}
                  <strong>{etiquetaEstado(evento.a)}</strong>
                  <small>{formatearFecha(evento.created)}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mensaje && <p className="form-exito">{mensaje}</p>}
      {error && <p className="form-error">{error}</p>}

      <section className="detalle-card detalle-acciones">
        <h3>Acciones</h3>

        {cerrada ? (
          <p className="detalle-vacio">
            Esta orden está cerrada y no admite más cambios.
          </p>
        ) : (
          <div className="acciones-botones">
            {siguientes.map((estado) =>
              estado === "presupuestada" ? (
                <button
                  key={estado}
                  className="btn-primary"
                  onClick={() => setMostrandoPresupuesto(true)}
                >
                  {ETIQUETAS_ACCION[estado]}
                </button>
              ) : (
                <button
                  key={estado}
                  className={
                    estado === "cancelada" || estado === "rechazada"
                      ? "btn-peligro"
                      : "btn-primary"
                  }
                  onClick={() => avanzar(estado)}
                  disabled={enviando}
                >
                  {ETIQUETAS_ACCION[estado]}
                </button>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default DetalleOrden;
