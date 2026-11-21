
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { obtenerRegistros } from "../services/pocketbase";
import { etiquetaEstado } from "../estados";

function Dashboard() {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarOrdenes() {
      try {
        const datos = await obtenerRegistros("ordenes");
        setOrdenes(datos);
      } catch (error) {
        setError("No se pudieron cargar las órdenes.");
        console.error(error);
      } finally {
        setCargando(false);
      }
    }

    cargarOrdenes();
  }, []);

  // Calcular indicadores
  const totalOrdenes = ordenes.length;

  const enReparacion = ordenes.filter(
    (orden) => orden.estado === "en_reparacion"
  ).length;

  const pendientes = ordenes.filter(
    (orden) =>
      ["solicitada", "en_diagnostico", "presupuestada", "aprobada"]
        .includes(orden.estado)
  ).length;

  const entregadas = ordenes.filter(
    (orden) => orden.estado === "entregada"
  ).length;

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <h2>Panel principal</h2>
          <p>Bienvenido al sistema de gestión del taller.</p>
        </div>

        <span className="dashboard-date">
          Gestión de reparaciones
        </span>
      </div>

      {/* Indicadores */}
      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-icon">📋</span>
          <p>Órdenes totales</p>
          <h3>{cargando ? "..." : totalOrdenes}</h3>
          <small>Registradas en el sistema</small>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🔧</span>
          <p>En reparación</p>
          <h3>{cargando ? "..." : enReparacion}</h3>
          <small>Trabajos en proceso</small>
        </article>

        <article className="stat-card">
          <span className="stat-icon">⏳</span>
          <p>Pendientes</p>
          <h3>{cargando ? "..." : pendientes}</h3>
          <small>Esperando atención</small>
        </article>

        <article className="stat-card">
          <span className="stat-icon">✅</span>
          <p>Entregadas</p>
          <h3>{cargando ? "..." : entregadas}</h3>
          <small>Reparaciones finalizadas</small>
        </article>
      </div>

      {/* Órdenes recientes */}
      <section className="recent-orders">
        <div className="section-heading">
          <div>
            <h2>Órdenes recientes</h2>
            <p>Resumen de las últimas órdenes registradas.</p>
          </div>
        </div>

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
            <p>
              Aquí aparecerán las órdenes de reparación
              registradas en el taller.
            </p>
          </div>
        ) : (
          <div className="orders-list">
            {ordenes.slice(-5).reverse().map((orden) => (
              <Link
                to={`/ordenes/${orden.id}`}
                className="order-item"
                key={orden.id}
              >
                <div>
                  <h3>{orden.equipo}</h3>
                  <p>{orden.problema}</p>
                </div>

                <span className={`estado estado-${orden.estado}`}>
                  {etiquetaEstado(orden.estado)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
