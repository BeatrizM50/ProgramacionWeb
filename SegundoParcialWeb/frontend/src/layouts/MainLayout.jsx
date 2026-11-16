
import { Outlet } from 'react-router'
import Sidebar from '../components/Sidebar'

function MainLayout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <header className="topbar">
          <div>
            <h1>Sistema de gestión</h1>
            <p>Administración del taller de reparaciones</p>
          </div>

          <div className="user-info">
            <div className="user-avatar">A</div>
            <div>
              <strong>Administrador</strong>
              <span>Personal del taller</span>
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
