
import { NavLink } from 'react-router'

function Sidebar() {
  const opciones = [
    { nombre: 'Panel principal', ruta: '/', icono: '⌂' },
    { nombre: 'Órdenes', ruta: '/ordenes', icono: '▤' },
    { nombre: 'Clientes', ruta: '/clientes', icono: '♙' },
    { nombre: 'Historial', ruta: '/historial', icono: '◷' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">T</div>
        <div>
          <h2>EL TALLER</h2>
          <span>Gestión de reparaciones</span>
        </div>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">MENÚ PRINCIPAL</p>

        <nav className="sidebar-nav">
          {opciones.map((opcion) => (
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
              end={opcion.ruta === '/'}
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <span className="sidebar-icon">{opcion.icono}</span>
              {opcion.nombre}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <span>●</span> Sistema de taller
      </div>
    </aside>
  )
}

export default Sidebar
