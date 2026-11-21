import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { obtenerRegistros } from "../services/pocketbase";
import { etiquetaEstado } from "../estados";

function Ordenes() {
  const navigate = useNavigate();

  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarOrdenes() {
      try {
        const datos = await obtenerRegistros("ordenes", {
          expand: "cliente",
          sort: "-created",
          signal: controlador.signal,
        });
        setOrdenes(datos);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("No se pudieron cargar las órdenes.");
          console.error(err);
        }
      } finally {
        setCargando(false);
      }
    }

    cargarOrdenes();

    return () => controlador.abort();
  }, []);

  function formatearFecha(fecha) {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="ordenes-page">
      <div className="ordenes-heading">
        <div>
          <h2>Órdenes de reparación</h2>
          <p>Consulta y administra las reparaciones del taller.</p>
        </div>

        <button
          className="btn-primary"
          onClick={() => navigate("/ordenes/nueva")}
        >
          + Nueva orden
        </button>
      </div>

      <div className="ordenes-table-container">
        {cargando ? (
          <div className="empty-state">
            <h3>Cargando órdenes...</h3>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Error de conexión</h3>
            <p>{error}</p>
          </div>
        ) : ordenes.length === 0 ? (
          <div className="empty-state">
            <span>📂</span>
            <h3>Sin órdenes registradas</h3>
            <p>Registra un equipo para empezar.</p>
          </div>
        ) : (
          <table className="ordenes-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Problema</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {ordenes.map((orden) => (
                <tr
                  key={orden.id}
                  className="ordenes-row"
                  onClick={() => navigate(`/ordenes/${orden.id}`)}
                >
                  <td>{orden.expand?.cliente?.nombre || "—"}</td>
                  <td>{orden.equipo}</td>
                  <td>{orden.problema}</td>
                  <td>{formatearFecha(orden.created)}</td>
                  <td>
                    <span className={`estado estado-${orden.estado}`}>
                      {etiquetaEstado(orden.estado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="ordenes-hint">
        Haz clic en una orden para ver su detalle y avanzar su etapa.
      </p>
    </div>
  );
}

export default Ordenes;
