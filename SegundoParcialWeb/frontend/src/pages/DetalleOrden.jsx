
import { useParams } from 'react-router'

function DetalleOrden() {
  const { id } = useParams()

  return (
    <section>
      <h2>Detalle de la orden</h2>
      <p>Identificador de la orden: {id}</p>
    </section>
  )
}

export default DetalleOrden