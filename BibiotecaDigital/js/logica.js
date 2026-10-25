'use strict';
/* Lógica de negocio: no toca el DOM ni localStorage. */
const Biblioteca = (() => {
  const MAX_ACTIVOS = 3;
  const DIAS_PRESTAMO = 14;
  const pad = n => String(n).padStart(2, '0');
  const aISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const deISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const hoy = () => aISO(new Date());
  const sumarDias = (iso, n) => { const d = deISO(iso); d.setDate(d.getDate() + n); return aISO(d); };
  const diasEntre = (a, b) => Math.round((deISO(b) - deISO(a)) / 86400000);
  const formatear = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const crearId = p => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const normalizar = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const colador = new Intl.Collator('es', { sensitivity: 'base' });

  const PORTADAS = {
    l1: 'img/cien-anos-soledad.jpg', l2: 'img/el-aleph.jpg', l3: 'img/historia-del-tiempo.jpg',
    l4: 'img/sapiens.jpg', l5: 'img/cosmos.jpg', l6: 'img/la-sombra-del-viento.jpg',
    l7: 'img/don-quijote.jpg', l8: 'img/origen-de-las-especies.jpg', l9: 'img/pedro-paramo.jpg'
  };

  /* Completa la portada de los libros iniciales guardados antes de existir esta propiedad. */
  function completarPortadas(d) {
    let cambio = false;
    d.libros.forEach(l => {
      if (l.portada === undefined) { l.portada = PORTADAS[l.id] || ''; cambio = true; }
    });
    return cambio;
  }

  function datosIniciales(h = hoy()) {
    const libro = (id, titulo, autor, anio, genero, coleccion = false, comentario = '') =>
      ({ id, titulo, autor, anio, genero, coleccion, comentario });
    const prestamo = (id, idLibro, persona, desde, devuelto) => ({
      id, idLibro, persona, fechaPrestamo: sumarDias(h, -desde),
      fechaLimite: sumarDias(h, -desde + DIAS_PRESTAMO),
      fechaDevolucion: devuelto === null ? null : sumarDias(h, -devuelto)
    });
    return {
      libros: [
        libro('l1', 'Cien años de soledad', 'Gabriel García Márquez', 1967, 'novela', false, 'La saga de los Buendía.'),
        libro('l2', 'El Aleph', 'Jorge Luis Borges', 1949, 'novela'),
        libro('l3', 'Breve historia del tiempo', 'Stephen Hawking', 1988, 'ciencia'),
        libro('l4', 'Sapiens', 'Yuval Noah Harari', 2011, 'historia'),
        libro('l5', 'Cosmos', 'Carl Sagan', 1980, 'ciencia'),
        libro('l6', 'La sombra del viento', 'Carlos Ruiz Zafón', 2001, 'novela'),
        libro('l7', 'Don Quijote de la Mancha', 'Miguel de Cervantes', 1605, 'novela', true, 'Edición antigua.'),
        libro('l8', 'El origen de las especies', 'Charles Darwin', 1859, 'ciencia', true),
        libro('l9', 'Pedro Páramo', 'Juan Rulfo', 1955, 'novela')
      ].map(l => ({ ...l, portada: PORTADAS[l.id] || '' })),
      prestamos: [
        prestamo('p1', 'l1', 'Ana', 5, null),          // activo
        prestamo('p2', 'l2', 'Luis', 20, null),        // activo y vencido
        prestamo('p3', 'l3', 'Marta', 30, 18),         // devuelto a tiempo
        prestamo('p4', 'l4', 'Pedro', 40, 20)          // devuelto con retraso
      ]
    };
  }

  const prestamoActivo = (d, idLibro) => d.prestamos.find(p => p.idLibro === idLibro && p.fechaDevolucion === null);
  const activos = d => d.prestamos.filter(p => p.fechaDevolucion === null);
  const devueltos = d => d.prestamos.filter(p => p.fechaDevolucion !== null);
  const libroPorId = (d, id) => d.libros.find(l => l.id === id);
  const estaVencido = (p, h = hoy()) => p.fechaDevolucion === null && p.fechaLimite < h;
  const diasRetraso = (p, h = hoy()) => {
    const fin = p.fechaDevolucion === null ? h : p.fechaDevolucion;
    return Math.max(0, diasEntre(p.fechaLimite, fin));
  };
  const estadoLibro = (d, l) => l.coleccion ? 'coleccion' : (prestamoActivo(d, l.id) ? 'prestado' : 'disponible');
  const generos = d => [...new Set(d.libros.map(l => l.genero))].sort(colador.compare);

  function validarPersona(texto) {
    const n = String(texto).trim().length;
    return n >= 2 && n <= 40 ? '' : 'El nombre debe tener entre 2 y 40 caracteres.';
  }

  function prestar(d, idLibro, persona, h = hoy()) {
    const l = libroPorId(d, idLibro);
    if (!l) return { ok: false, campo: 'general', mensaje: 'El libro no existe.' };
    if (l.coleccion) return { ok: false, campo: 'general', mensaje: 'Los libros de colección no se prestan.' };
    if (prestamoActivo(d, idLibro)) return { ok: false, campo: 'general', mensaje: 'Ese libro ya está prestado.' };
    if (activos(d).length >= MAX_ACTIVOS)
      return { ok: false, campo: 'general', mensaje: `No se puede prestar: ya hay ${MAX_ACTIVOS} préstamos activos.` };
    const err = validarPersona(persona);
    if (err) return { ok: false, campo: 'persona', mensaje: err };
    const p = { id: crearId('p'), idLibro, persona: String(persona).trim(), fechaPrestamo: h,
      fechaLimite: sumarDias(h, DIAS_PRESTAMO), fechaDevolucion: null };
    d.prestamos.push(p);
    return { ok: true, prestamo: p };
  }

  function devolver(d, idLibro, h = hoy()) {
    const p = prestamoActivo(d, idLibro);
    if (!p) return { ok: false, mensaje: 'Ese libro no tiene un préstamo activo.' };
    p.fechaDevolucion = h;
    return { ok: true, prestamo: p, retraso: diasRetraso(p, h) };
  }

  function validarLibro(d, c, idEditado = null) {
    const e = {};
    const titulo = String(c.titulo).trim(), autor = String(c.autor).trim();
    if (titulo.length < 3 || titulo.length > 60) e.titulo = 'El título debe tener entre 3 y 60 caracteres.';
    if (!autor) e.autor = 'El autor no puede estar vacío.';
    const anio = Number(c.anio);
    if (c.anio === '' || !Number.isInteger(anio) || anio < 1000 || anio > 2026) e.anio = 'El año debe estar entre 1000 y 2026.';
    if (!c.genero) e.genero = 'Elige un género.';
    if (String(c.comentario).length > 120) e.comentario = 'El comentario admite como máximo 120 caracteres.';
    if (!e.titulo && autor && d.libros.some(l => l.id !== idEditado &&
      normalizar(l.titulo) === normalizar(titulo) && normalizar(l.autor) === normalizar(autor)))
      e.titulo = 'Ya existe un libro con ese título y autor.';
    if (idEditado && c.coleccion && prestamoActivo(d, idEditado))
      e.coleccion = 'Un libro con préstamo activo no puede ser de colección.';
    return e;
  }

  function guardarLibro(d, c, idEditado = null) {
    const errores = validarLibro(d, c, idEditado);
    if (Object.keys(errores).length) return { ok: false, errores };
    const datos = { titulo: String(c.titulo).trim(), autor: String(c.autor).trim(), anio: Number(c.anio),
      genero: c.genero, coleccion: Boolean(c.coleccion), comentario: String(c.comentario).trim() };
    if (idEditado) { Object.assign(libroPorId(d, idEditado), datos); return { ok: true, editado: true }; }
    d.libros.push({ id: crearId('l'), ...datos, portada: '' });
    return { ok: true, editado: false };
  }

  function eliminarLibro(d, id) {
    const l = libroPorId(d, id);
    if (!l) return { ok: false, mensaje: 'El libro no existe.' };
    if (prestamoActivo(d, id)) return { ok: false, mensaje: `«${l.titulo}» tiene un préstamo activo y no se puede eliminar.` };
    d.libros = d.libros.filter(x => x.id !== id);
    d.prestamos = d.prestamos.filter(p => p.idLibro !== id);
    return { ok: true, titulo: l.titulo };
  }

  function filtrar(d, { texto = '', estado = 'todos', genero = '' } = {}) {
    const t = normalizar(texto);
    return d.libros.filter(l => {
      if (t && !normalizar(l.titulo).includes(t) && !normalizar(l.autor).includes(t)) return false;
      if (genero && l.genero !== genero) return false;
      const est = estadoLibro(d, l);
      if (estado === 'disponibles') return est === 'disponible';
      if (estado === 'prestados') return est === 'prestado';
      return true;
    });
  }

  function ordenar(lista, { campo = 'titulo', dir = 'asc' } = {}) {
    const f = dir === 'desc' ? -1 : 1;
    return [...lista].sort((a, b) =>
      f * (campo === 'anio' ? a.anio - b.anio : colador.compare(a[campo], b[campo])));
  }

  function resumen(d, h = hoy()) {
    const act = activos(d);
    const porGenero = {};
    d.libros.forEach(l => { porGenero[l.genero] = (porGenero[l.genero] || 0) + 1; });
    return {
      total: d.libros.length,
      disponibles: d.libros.filter(l => estadoLibro(d, l) === 'disponible').length,
      prestados: act.length,
      vencidos: act.filter(p => estaVencido(p, h)).length,
      porGenero
    };
  }

  return { MAX_ACTIVOS, completarPortadas, hoy, formatear, datosIniciales, prestamoActivo, activos, devueltos, libroPorId,
    estaVencido, diasRetraso, estadoLibro, generos, validarPersona, prestar, devolver, validarLibro,
    guardarLibro, eliminarLibro, filtrar, ordenar, resumen };
})();
