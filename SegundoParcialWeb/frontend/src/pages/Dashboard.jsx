
function Dashboard() {
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
          <h3>24</h3>
          <small>Registradas en el sistema</small>
        </article>

        <article className="stat-card">
          <span className="stat-icon">🔧</span>
          <p>En reparación</p>
          <h3>8</h3>
          <small>Trabajos en proceso</small>
        </article>

        <article className="stat-card">
          <span className="stat-icon">⏳</span>
          <p>Pendientes</p>
          <h3>5</h3>
          <small>Esperando atención</small>
        </article>

        <article className="stat-card">
          <span className="stat-icon">✅</span>
          <p>Entregadas</p>
          <h3>11</h3>
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

        <div className="empty-state">
          <span>📂</span>
          <h3>Próximamente</h3>
          <p>
            Aquí aparecerán las órdenes de reparación
            registradas en el taller.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
