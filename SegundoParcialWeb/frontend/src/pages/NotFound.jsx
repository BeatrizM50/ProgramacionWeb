
import { Link } from 'react-router'

function NotFound() {
  return (
    <section>
      <h2>404 - Página no encontrada</h2>
      <p>La dirección que buscas no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </section>
  )
}

export default NotFound