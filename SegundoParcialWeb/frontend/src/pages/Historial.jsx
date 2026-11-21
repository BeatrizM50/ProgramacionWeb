import { useEffect, useState } from "react";
import { Link } from "react-router";
import { obtenerRegistros } from "../services/pocketbase";
import { etiquetaEstado } from "../estados";

function Historial() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarEventos() {
      try {
        const datos = await obtenerRegistros("eventos", {
          sort: "-created",
          expand: "orden",
          signal: controlador.signal,
        });
        setEventos(datos);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("No se pudo cargar el historial.");
          console.error(err);
        }
      } finally {
        setCargando(false);
      }
    }

    cargarEventos();

    return () => controlador.abort();
  }, []);

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

  return (
    <div className="ordenes-page">
      <div className="ordenes-heading">
        <div>
          <h2>Historial</h2>
          <p>Todos los cambios de etapa registrados por el sistema.</p>
        </div>
      </div>

      <div className="ordenes-table-container">
        {cargando ? (
          <div className="empty-state">
            <h3>Cargando historial...</h3>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Error de conexión</h3>
            <p>{error}</p>
          </div>
        ) : eventos.length === 0 ? (
          <div className="empty-state">
            <span>◷</span>
            <h3>Sin eventos registrados</h3>
            <p>Los cambios de etapa aparecerán aquí.</p>
          </div>
        ) : (
          <table className="ordenes-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Equipo</th>
                <th>De</th>
                <th>A</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id}>
                  <td>{formatearFecha(evento.created)}</td>
                  <td>
                    <Link
                      to={`/ordenes/${evento.orden}`}
                      className="historial-link"
                    >
                      {evento.expand?.orden?.equipo || evento.orden}
                    </Link>
                  </td>
                  <td>{etiquetaEstado(evento.de)}</td>
                  <td>{etiquetaEstado(evento.a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Historial;
