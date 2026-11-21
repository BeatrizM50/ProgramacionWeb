import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  crearRegistro,
  crearRegistroConArchivos,
  obtenerRegistros,
} from "../services/pocketbase";

function NuevaOrden() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [telefonoNuevo, setTelefonoNuevo] = useState("");
  const [equipo, setEquipo] = useState("");
  const [problema, setProblema] = useState("");
  const [fotos, setFotos] = useState([]);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarClientes() {
      try {
        const datos = await obtenerRegistros("clientes", {
          sort: "nombre",
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

  function seleccionarFotos(evento) {
    const archivos = Array.from(evento.target.files);
    if (archivos.length > 3) {
      setError("Máximo 3 fotos por orden.");
      return;
    }
    setError("");
    setFotos(archivos);
  }

  async function enviar(evento) {
    evento.preventDefault();
    setError("");

    if (!equipo.trim() || !problema.trim()) {
      setError("El equipo y el problema son obligatorios.");
      return;
    }

    if (!clienteSeleccionado) {
      setError("Selecciona un cliente o registra uno nuevo.");
      return;
    }

    setEnviando(true);

    try {
      let clienteId = clienteSeleccionado;

      if (clienteSeleccionado === "nuevo") {
        if (!nombreNuevo.trim()) {
          throw new Error("El nombre del cliente es obligatorio.");
        }

        const nuevo = await crearRegistro("clientes", {
          nombre: nombreNuevo.trim(),
          telefono: telefonoNuevo.trim() || "Sin teléfono",
        });
        clienteId = nuevo.id;
      }

      const datos = new FormData();
      datos.append("cliente", clienteId);
      datos.append("equipo", equipo.trim());
      datos.append("problema", problema.trim());
      datos.append("estado", "solicitada");

      for (const archivo of fotos) {
        datos.append("fotos", archivo);
      }

      const orden = await crearRegistroConArchivos("ordenes", datos);
      navigate(`/ordenes/${orden.id}`);
    } catch (err) {
      setError(err.message || "No se pudo crear la orden.");
      setEnviando(false);
    }
  }

  return (
    <div className="ordenes-page">
      <div className="ordenes-heading">
        <div>
          <h2>Nueva orden</h2>
          <p>Registra el equipo que trae un cliente al taller.</p>
        </div>
      </div>

      <form className="orden-form" onSubmit={enviar}>
        <div className="form-section">
          <h3>Cliente</h3>

          <label className="form-field">
            <span>Cliente existente o nuevo</span>
            <select
              value={clienteSeleccionado}
              onChange={(e) => setClienteSeleccionado(e.target.value)}
              disabled={cargando}
            >
              <option value="">Selecciona un cliente...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
              <option value="nuevo">+ Registrar cliente nuevo</option>
            </select>
          </label>

          {clienteSeleccionado === "nuevo" && (
            <div className="form-row">
              <label className="form-field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </label>

              <label className="form-field">
                <span>Teléfono</span>
                <input
                  type="text"
                  value={telefonoNuevo}
                  onChange={(e) => setTelefonoNuevo(e.target.value)}
                  placeholder="Teléfono de contacto"
                />
              </label>
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>Equipo</h3>

          <label className="form-field">
            <span>Equipo</span>
            <input
              type="text"
              value={equipo}
              onChange={(e) => setEquipo(e.target.value)}
              placeholder="Ej. Laptop HP Pavilion"
            />
          </label>

          <label className="form-field">
            <span>Problema reportado</span>
            <textarea
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              placeholder="Describe qué le pasa al equipo"
              rows="3"
            />
          </label>

          <label className="form-field">
            <span>Fotos (hasta 3)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={seleccionarFotos}
            />
          </label>

          {fotos.length > 0 && (
            <p className="form-hint">
              {fotos.length} foto(s) seleccionada(s).
            </p>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/ordenes")}
            disabled={enviando}
          >
            Cancelar
          </button>

          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? "Guardando..." : "Registrar orden"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NuevaOrden;
