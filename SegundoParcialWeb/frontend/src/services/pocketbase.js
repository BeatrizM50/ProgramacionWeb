export const API_BASE = "http://127.0.0.1:8090";

const API_URL = `${API_BASE}/api/collections`;

async function solicitar(url, opciones = {}) {
  const respuesta = await fetch(url, opciones);

  if (!respuesta.ok) {
    let mensaje = `Error ${respuesta.status} al conectar con el servidor`;

    try {
      const cuerpo = await respuesta.json();

      if (cuerpo.message) {
        mensaje = cuerpo.message;
      }

      if (cuerpo.data && typeof cuerpo.data === "object") {
        const detalles = Object.values(cuerpo.data)
          .filter((v) => v && typeof v === "object")
          .map((v) => v.message)
          .filter(Boolean);

        if (detalles.length) {
          mensaje = detalles.join(". ");
        }
      }
    } catch {
      // el cuerpo no era JSON
    }

    throw new Error(mensaje);
  }

  return respuesta.status === 204 ? null : respuesta.json();
}

function construirParams({ expand, sort, filter, fields, perPage } = {}) {
  const params = new URLSearchParams();

  if (expand) params.set("expand", expand);
  if (sort) params.set("sort", sort);
  if (filter) params.set("filter", filter);
  if (fields) params.set("fields", fields);
  if (perPage) params.set("perPage", String(perPage));

  const query = params.toString();
  return query ? `?${query}` : "";
}

// Listar registros de una colección
export async function obtenerRegistros(coleccion, opciones = {}) {
  const { signal, ...filtros } = opciones;
  const datos = await solicitar(
    `${API_URL}/${coleccion}/records${construirParams(filtros)}`,
    { signal }
  );

  return datos.items;
}

// Ver un registro por id
export async function obtenerRegistro(coleccion, id, opciones = {}) {
  const { signal, ...filtros } = opciones;
  return solicitar(
    `${API_URL}/${coleccion}/records/${id}${construirParams(filtros)}`,
    { signal }
  );
}

// Crear un registro enviando JSON
export async function crearRegistro(coleccion, datos) {
  return solicitar(`${API_URL}/${coleccion}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

// Crear un registro con archivos (multipart/form-data)
export async function crearRegistroConArchivos(coleccion, formData) {
  return solicitar(`${API_URL}/${coleccion}/records`, {
    method: "POST",
    body: formData,
  });
}

// Actualizar un registro (PATCH)
export async function actualizarRegistro(coleccion, id, datos) {
  return solicitar(`${API_URL}/${coleccion}/records/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

// URL pública de un archivo subido
export function urlArchivo(coleccion, idRegistro, nombreArchivo) {
  return `${API_BASE}/api/files/${coleccion}/${idRegistro}/${nombreArchivo}`;
}
