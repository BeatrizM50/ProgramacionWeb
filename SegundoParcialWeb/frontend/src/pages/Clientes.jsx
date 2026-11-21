import { useEffect, useState } from "react";
import { obtenerRegistros } from "../services/pocketbase";

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarClientes() {
      try {
        const datos = await obtenerRegistros("clientes", {
          sort: "nombre",
          expand: "ordenes_via_cliente",
          signal: controlador.signal,
        });
        setClientes(datos);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("No se pudieron cargar los clientes.");
          console.error(err);
        }
      } finally {
        setCargando(false);
      }
    }

    cargarClientes();

    return () => controlador.abort();
  }, []);

  return (
    <div className="ordenes-page">
      <div className="ordenes-heading">
        <div>
          <h2>Clientes</h2>
          <p>Personas que han traído equipos al taller.</p>
        </div>
      </div>

      <div className="ordenes-table-container">
        {cargando ? (
          <div className="empty-state">
            <h3>Cargando clientes...</h3>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Error de conexión</h3>
            <p>{error}</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="empty-state">
            <span>♙</span>
            <h3>Sin clientes registrados</h3>
            <p>Los clientes aparecerán al registrar órdenes.</p>
          </div>
        ) : (
          <table className="ordenes-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Órdenes</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.nombre}</td>
                  <td>{cliente.telefono}</td>
                  <td>{cliente.expand?.ordenes_via_cliente?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Clientes;
