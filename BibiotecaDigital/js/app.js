'use strict';
/* Interfaz: dibuja todo a partir de datos.libros y datos.prestamos. */
(() => {
  const L = Biblioteca;
  const K = { datos: 'biblioteca.datos', tema: 'biblioteca.tema', usuario: 'biblioteca.usuario', orden: 'biblioteca.orden' };
  const ORDEN_BASE = { campo: 'titulo', dir: 'asc' };
  const $ = s => document.querySelector(s);
  const leer = (k, def) => { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

  let datos = leer(K.datos, null);
  if (!datos || !Array.isArray(datos.libros) || !Array.isArray(datos.prestamos)) datos = L.datosIniciales();
  let tema = leer(K.tema, 'claro');
  let usuario = leer(K.usuario, '');
  let orden = leer(K.orden, { ...ORDEN_BASE });
  let filtros = { texto: '', estado: 'todos', genero: '' };
  let vista = 'catalogo', editandoId = null, idPrestar = null, idEliminar = null;

  const guardar = () => { escribir(K.datos, datos); escribir(K.tema, tema); escribir(K.usuario, usuario); escribir(K.orden, orden); };
  if (L.completarPortadas(datos)) guardar();
  const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto !== undefined) e.textContent = texto; return e; };
  function portada(l) {
    const marco = el('div', 'portada');
    const vacia = () => el('span', 'sin-portada', 'Sin portada');
    if (!l.portada) { marco.append(vacia()); return marco; }
    const img = document.createElement('img');
    img.src = l.portada; img.alt = `Portada de «${l.titulo}»`; img.loading = 'lazy';
    img.addEventListener('error', () => marco.replaceChildren(vacia()));
    marco.append(img);
    return marco;
  }
  const etiqueta = (texto, clase) => el('span', `etiqueta ${clase}`, texto);

  function aviso(texto, tipo = 'ok') {
    const a = $('#aviso');
    a.textContent = texto;
    a.className = `aviso ${tipo === 'ok' ? 'ok' : 'mal'}`;
  }
  const limpiarAviso = () => { const a = $('#aviso'); a.textContent = ''; a.className = 'aviso'; };

  /* ---------- Navegación ---------- */
  function navegar(nombre) {
    vista = nombre;
    document.querySelectorAll('.vista').forEach(s => { s.hidden = s.id !== `vista-${nombre}`; });
    document.querySelectorAll('[data-vista]').forEach(a => {
      const activa = a.dataset.vista === nombre;
      a.classList.toggle('activa', activa);
      if (activa) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ---------- Catálogo ---------- */
  function tarjeta(l) {
    const estado = L.estadoLibro(datos, l);
    const p = L.prestamoActivo(datos, l.id);
    const t = el('article', estado === 'prestado' ? 'tarjeta prestada' : 'tarjeta');
    t.append(portada(l), el('h3', '', l.titulo), el('p', '', l.autor), el('p', 'meta', `${l.anio} – ${l.genero}`));
    const et = el('div', 'etiquetas');
    et.append(estado === 'coleccion' ? etiqueta('De colección', 'et-coleccion')
      : estado === 'prestado' ? etiqueta('Prestado', 'et-prestado') : etiqueta('Disponible', 'et-disponible'));
    if (p && L.estaVencido(p)) et.append(etiqueta('Vencido', 'et-vencido'));
    t.append(et);
    if (p) t.append(el('p', '', `Prestado a ${p.persona}`), el('p', 'meta', `Devolver antes del ${L.formatear(p.fechaLimite)}`));
    if (l.comentario) t.append(el('p', 'meta', l.comentario));
    const ac = el('div', 'acciones');
    const b1 = el('button', p ? 'btn btn-secundario' : 'btn btn-primario', p ? 'Devolver' : 'Prestar');
    b1.type = 'button'; b1.dataset.accion = p ? 'devolver' : 'prestar'; b1.dataset.id = l.id;
    if (l.coleccion) { b1.disabled = true; b1.title = 'Los libros de colección no se prestan'; }
    const b2 = el('button', 'btn btn-claro', 'Editar'); b2.type = 'button'; b2.dataset.accion = 'editar'; b2.dataset.id = l.id;
    const b3 = el('button', 'btn btn-peligro', 'Eliminar'); b3.type = 'button'; b3.dataset.accion = 'eliminar'; b3.dataset.id = l.id;
    ac.append(b1, b2, b3);
    t.append(ac);
    return t;
  }

  function renderCatalogo() {
    const gens = L.generos(datos);
    if (filtros.genero && !gens.includes(filtros.genero)) filtros.genero = '';
    const sel = $('#filtro-genero');
    sel.replaceChildren(new Option('Todos los géneros', ''), ...gens.map(g => new Option(g, g)));
    sel.value = filtros.genero;
    const lista = L.ordenar(L.filtrar(datos, filtros), orden);
    const cont = $('#lista-libros');
    cont.replaceChildren(...lista.map(tarjeta));
    if (!lista.length) cont.append(el('p', 'meta', 'Ningún libro coincide con los filtros.'));
    $('#contador').textContent = `Mostrando ${lista.length} de ${datos.libros.length} libros`;
    document.querySelectorAll('[data-estado]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.estado === filtros.estado)));
    $('#orden-campo').value = orden.campo; $('#orden-dir').value = orden.dir;
  }

  /* ---------- Préstamos ---------- */
  function renderPrestamos() {
    const act = L.activos(datos).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
    const ul = $('#lista-activos');
    ul.replaceChildren(...act.map(p => {
      const l = L.libroPorId(datos, p.idLibro);
      const venc = L.estaVencido(p);
      const li = el('li', venc ? 'vencido' : '');
      const info = el('div');
      info.append(el('strong', '', l.titulo), el('p', 'meta', `Prestado a ${p.persona} – Límite: ${L.formatear(p.fechaLimite)}`));
      if (venc) { const e = el('div', 'etiquetas'); e.append(etiqueta(`Vencido: ${L.diasRetraso(p)} día(s) de retraso`, 'et-vencido')); info.append(e); }
      const b = el('button', 'btn btn-secundario', 'Devolver'); b.type = 'button'; b.dataset.accion = 'devolver'; b.dataset.id = l.id;
      li.append(info, b);
      return li;
    }));
    if (!act.length) ul.append(el('li', 'vacio', 'No hay ningún préstamo activo.'));

    const hist = L.devueltos(datos).sort((a, b) => b.fechaDevolucion.localeCompare(a.fechaDevolucion));
    const uh = $('#lista-historial');
    uh.replaceChildren(...hist.map(p => {
      const l = L.libroPorId(datos, p.idLibro);
      const r = L.diasRetraso(p);
      const li = el('li');
      const info = el('div');
      info.append(el('strong', '', l.titulo),
        el('p', 'meta', `${p.persona} – Prestado: ${L.formatear(p.fechaPrestamo)} – Devuelto: ${L.formatear(p.fechaDevolucion)}`));
      li.append(info, r ? etiqueta(`Con ${r} día(s) de retraso`, 'et-retraso') : etiqueta('A tiempo', 'et-tiempo'));
      return li;
    }));
    if (!hist.length) uh.append(el('li', 'vacio', 'Todavía no hay préstamos devueltos.'));
  }

  /* ---------- Resumen ---------- */
  function renderResumen() {
    const r = L.resumen(datos);
    const caja = (n, t) => { const d = el('div', 'stat'); d.append(el('strong', '', String(n)), el('span', '', t)); return d; };
    $('#resumen').replaceChildren(caja(r.total, 'Libros'), caja(r.disponibles, 'Disponibles'), caja(r.prestados, 'Prestados'), caja(r.vencidos, 'Vencidos'));
    $('#resumen-generos').replaceChildren(...Object.keys(r.porGenero).sort().map(g => {
      const li = el('li'); li.append(el('span', '', g), el('strong', '', String(r.porGenero[g]))); return li;
    }));
  }

  function render() {
    document.documentElement.dataset.tema = tema === 'oscuro' ? 'oscuro' : 'claro';
    document.querySelectorAll('[data-tema-btn]').forEach(b => { b.textContent = tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'; });
    $('#enlace-prestamos').textContent = `Mis préstamos (${L.activos(datos).length})`;
    $('#saludo').textContent = usuario ? `Hola, ${usuario}` : '';
    renderCatalogo(); renderPrestamos(); renderResumen();
  }

  /* ---------- Modales ---------- */
  const modalAbierto = () => !$('#modal-prestar').hidden || !$('#modal-eliminar').hidden;
  function cerrarModales() { $('#modal-prestar').hidden = true; $('#modal-eliminar').hidden = true; idPrestar = idEliminar = null; }
  function abrirPrestar(id) {
    idPrestar = id;
    $('#mp-titulo').textContent = `Prestar «${L.libroPorId(datos, id).titulo}»`;
    $('#mp-persona').value = usuario; $('#mp-error').textContent = '';
    $('#modal-prestar').hidden = false; $('#mp-persona').focus();
  }
  function abrirEliminar(id) {
    idEliminar = id;
    $('#me-titulo').textContent = `¿Eliminar «${L.libroPorId(datos, id).titulo}»?`;
    $('#modal-eliminar').hidden = false; $('#me-confirmar').focus();
  }

  /* ---------- Acciones del catálogo ---------- */
  $('#lista-libros').addEventListener('click', manejarAccion);
  $('#lista-activos').addEventListener('click', manejarAccion);
  function manejarAccion(e) {
    const b = e.target.closest('button[data-accion]');
    if (!b || b.disabled) return;
    const id = b.dataset.id; limpiarAviso();
    if (b.dataset.accion === 'prestar') {
      if (L.activos(datos).length >= L.MAX_ACTIVOS) return aviso(`No se puede prestar: ya hay ${L.MAX_ACTIVOS} préstamos activos.`, 'mal');
      abrirPrestar(id);
    } else if (b.dataset.accion === 'devolver') {
      const r = L.devolver(datos, id);
      if (!r.ok) return aviso(r.mensaje, 'mal');
      const t = L.libroPorId(datos, id).titulo;
      aviso(r.retraso ? `«${t}» se devolvió con ${r.retraso} día(s) de retraso.` : `«${t}» se devolvió a tiempo.`);
      guardar(); render();
    } else if (b.dataset.accion === 'editar') cargarEdicion(id);
    else if (b.dataset.accion === 'eliminar') {
      if (L.prestamoActivo(datos, id)) return aviso(`«${L.libroPorId(datos, id).titulo}» tiene un préstamo activo y no se puede eliminar.`, 'mal');
      abrirEliminar(id);
    }
  }

  $('#form-prestar').addEventListener('submit', e => {
    e.preventDefault();
    const r = L.prestar(datos, idPrestar, $('#mp-persona').value);
    if (!r.ok && r.campo === 'persona') { $('#mp-error').textContent = r.mensaje; $('#mp-persona').focus(); return; }
    const titulo = L.libroPorId(datos, idPrestar).titulo;
    cerrarModales();
    if (!r.ok) return aviso(r.mensaje, 'mal');
    aviso(`«${titulo}» se prestó a ${r.prestamo.persona}. Límite: ${L.formatear(r.prestamo.fechaLimite)}.`);
    guardar(); render();
  });
  $('#me-confirmar').addEventListener('click', () => {
    const r = L.eliminarLibro(datos, idEliminar);
    cerrarModales();
    if (!r.ok) return aviso(r.mensaje, 'mal');
    if (editandoId && !L.libroPorId(datos, editandoId)) cancelarEdicion();
    aviso(`«${r.titulo}» se eliminó de la biblioteca.`); guardar(); render();
  });
  document.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', cerrarModales));
  document.querySelectorAll('.fondo-modal').forEach(f => f.addEventListener('click', e => { if (e.target === f) cerrarModales(); }));

  /* ---------- Filtros y orden ---------- */
  $('#buscar').addEventListener('input', e => { filtros.texto = e.target.value; renderCatalogo(); });
  $('#filtro-genero').addEventListener('change', e => { filtros.genero = e.target.value; renderCatalogo(); });
  document.querySelectorAll('[data-estado]').forEach(b => b.addEventListener('click', () => { filtros.estado = b.dataset.estado; renderCatalogo(); }));
  $('#orden-campo').addEventListener('change', e => { orden.campo = e.target.value; guardar(); renderCatalogo(); });
  $('#orden-dir').addEventListener('change', e => { orden.dir = e.target.value; guardar(); renderCatalogo(); });

  /* ---------- Formulario de libro ---------- */
  const CAMPOS = ['titulo', 'autor', 'anio', 'genero', 'comentario', 'coleccion'];
  const form = $('#form-libro');
  const leerForm = () => ({ titulo: $('#f-titulo').value, autor: $('#f-autor').value, anio: $('#f-anio').value,
    genero: $('#f-genero').value, comentario: $('#f-comentario').value, coleccion: $('#f-coleccion').checked });
  const actualizarRestantes = () => { $('#restantes').textContent = `Quedan ${120 - $('#f-comentario').value.length} caracteres`; };
  const limpiarErrores = () => CAMPOS.forEach(c => { $(`#e-${c}`).textContent = ''; });

  function reiniciarForm() {
    form.reset(); limpiarErrores(); actualizarRestantes();
    editandoId = null; $('#t-agregar').textContent = 'Agregar libro';
    $('#btn-guardar').textContent = 'Agregar libro'; $('#btn-cancelar-edicion').hidden = true;
  }
  function cargarEdicion(id) {
    const l = L.libroPorId(datos, id);
    reiniciarForm(); editandoId = id;
    $('#f-titulo').value = l.titulo; $('#f-autor').value = l.autor; $('#f-anio').value = l.anio;
    $('#f-genero').value = l.genero; $('#f-comentario').value = l.comentario || ''; $('#f-coleccion').checked = l.coleccion;
    actualizarRestantes();
    $('#t-agregar').textContent = 'Editar libro'; $('#btn-guardar').textContent = 'Guardar cambios';
    $('#btn-cancelar-edicion').hidden = false;
    navegar('agregar'); $('#f-titulo').focus();
  }
  function cancelarEdicion() { reiniciarForm(); }

  form.addEventListener('submit', e => {
    e.preventDefault(); limpiarErrores(); limpiarAviso();
    const r = L.guardarLibro(datos, leerForm(), editandoId);
    if (!r.ok) {
      CAMPOS.forEach(c => { if (r.errores[c]) $(`#e-${c}`).textContent = r.errores[c]; });
      const primero = CAMPOS.find(c => r.errores[c]);
      $(`#f-${primero}`).focus();
      return;
    }
    aviso(r.editado ? 'Cambios guardados correctamente.' : 'Libro agregado correctamente.');
    reiniciarForm(); guardar(); render();
  });
  $('#f-comentario').addEventListener('input', actualizarRestantes);
  $('#btn-cancelar-edicion').addEventListener('click', cancelarEdicion);

  /* ---------- Ajustes ---------- */
  document.querySelectorAll('[data-tema-btn]').forEach(b => b.addEventListener('click', () => { tema = tema === 'oscuro' ? 'claro' : 'oscuro'; guardar(); render(); }));
  $('#form-usuario').addEventListener('submit', e => {
    e.preventDefault();
    const n = $('#f-usuario').value.trim();
    if (n.length > 40) { $('#e-usuario').textContent = 'El nombre admite como máximo 40 caracteres.'; return; }
    $('#e-usuario').textContent = ''; usuario = n; guardar(); render();
    aviso(n ? `Nombre guardado: ${n}.` : 'Nombre borrado.');
  });
  $('#btn-reset').addEventListener('click', () => {
    Object.values(K).forEach(k => { try { localStorage.removeItem(k); } catch { /* nada */ } });
    datos = L.datosIniciales(); tema = 'claro'; usuario = ''; orden = { ...ORDEN_BASE };
    filtros = { texto: '', estado: 'todos', genero: '' }; $('#buscar').value = ''; $('#f-usuario').value = '';
    reiniciarForm(); render(); aviso('Biblioteca restablecida a los datos iniciales.');
  });

  /* ---------- Menú y teclado ---------- */
  document.querySelectorAll('[data-vista]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); limpiarAviso(); navegar(a.dataset.vista); }));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (modalAbierto()) { cerrarModales(); return; }
    if (vista === 'agregar') cancelarEdicion();
  });

  $('#f-usuario').value = usuario;
  actualizarRestantes(); navegar('catalogo'); render();
})();
