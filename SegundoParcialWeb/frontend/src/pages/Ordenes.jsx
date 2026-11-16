
const ordenesPrueba = [
  {
    id: 'ORD-001',
    cliente: 'Carlos Pérez',
    equipo: 'Laptop HP',
    problema: 'No enciende',
    fecha: '15/11/2026',
    estado: 'solicitada',
  },
  {
    id: 'ORD-002',
    cliente: 'María Rodríguez',
    equipo: 'Teléfono Samsung',
    problema: 'Pantalla rota',
    fecha: '14/11/2026',
    estado: 'en_reparacion',
  },
  {
    id: 'ORD-003',
    cliente: 'José González',
    equipo: 'Laptop Lenovo',
    problema: 'Problemas con el teclado',
    fecha: '13/11/2026',
    estado: 'lista',
  },
]

function Ordenes() {
  return (
    <div className="ordenes-page">
      <div className="ordenes-heading">
        <div>
          <h2>Órdenes de reparación</h2>
          <p>Consulta y administra las reparaciones del taller.</p>
        </div>

        <button className="btn-primary">
          + Nueva orden
        </button>
      </div>

      <div className="ordenes-table-container">
        <table className="ordenes-table">
          <thead>
            <tr>
              <th>N.º Orden</th>
              <th>Cliente</th>
              <th>Equipo</th>
              <th>Problema</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {ordenesPrueba.map((orden) => (
              <tr key={orden.id}>
                <td>{orden.id}</td>
                <td>{orden.cliente}</td>
                <td>{orden.equipo}</td>
                <td>{orden.problema}</td>
                <td>{orden.fecha}</td>
                <td>
                  <span className={`estado estado-${orden.estado}`}>
                    {orden.estado.replaceAll('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Ordenes
