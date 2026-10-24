"use strict";

let datosBiblioteca = cargarDatos();
let preferenciasCatalogo = cargarPreferenciasCatalogo();
const preferenciasUsuario = cargarPreferenciasUsuario();

// Estado de la interfaz: null significa "ninguno".
let idLibroEditando = null;
let idLibroAPrestar = null;
let idLibroAEliminar = null;

// Muestra una sola vista y resalta su enlace del menú.
function mostrarVista(nombreVista) {
    document.querySelectorAll(".vista").forEach(function (vista) {
        const activa = vista.id === nombreVista;

        vista.hidden = !activa;
        vista.classList.toggle("activa", activa);
    });

    document.querySelectorAll("nav [data-vista]").forEach(function (enlace) {
        const activo = enlace.dataset.vista === nombreVista;

        enlace.classList.toggle("activo", activo);

        if (activo) {
            enlace.setAttribute("aria-current", "page");
        } else {
            enlace.removeAttribute("aria-current");
        }
    });

    mostrarMensajePagina("mensaje-catalogo", "");
    mostrarMensajePagina("mensaje-prestamos", "");
}

// Guarda los datos y dibuja de nuevo todo a partir de ellos.
function guardarYRenderizar() {
    guardarDatos(datosBiblioteca);
    renderizarCatalogo(datosBiblioteca);
}

// Aplica el tema y el nombre guardados.
function aplicarPreferenciasUsuario() {
    document.body.classList.toggle("oscuro", preferenciasUsuario.oscuro);

    document.getElementById("nombre-usuario").value = preferenciasUsuario.nombre;

    document.getElementById("saludo-usuario").textContent =
        preferenciasUsuario.nombre ? "Hola, " + preferenciasUsuario.nombre : "";
}

// Registra la devolución y escribe el mensaje en el elemento indicado.
function registrarDevolucion(idLibro, idMensaje) {
    const resultado = devolverLibro(idLibro, datosBiblioteca);

    mostrarMensajePagina(idMensaje, resultado.mensaje, !resultado.ok);

    if (resultado.ok) {
        guardarYRenderizar();
    }
}

// Abre el modal para pedir a quién se presta el libro.
function abrirModalPrestar(idLibro) {
    const libro = buscarLibroPorId(idLibro, datosBiblioteca);

    if (!libro) {
        return;
    }

    idLibroAPrestar = idLibro;

    const campo = document.getElementById("persona-prestamo");

    campo.value = preferenciasUsuario.nombre;
    campo.removeAttribute("aria-invalid");
    document.getElementById("error-persona").textContent = "";
    document.getElementById("texto-modal-prestar").textContent =
        "¿A quién se prestará «" + libro.titulo + "»?";

    abrirModal("modal-prestar", campo);
}

// Abre el modal de confirmación, salvo que el libro tenga un préstamo activo.
function pedirConfirmacionEliminar(idLibro) {
    const libro = buscarLibroPorId(idLibro, datosBiblioteca);

    if (!libro) {
        return;
    }

    if (buscarPrestamoActivo(idLibro, datosBiblioteca.prestamos) !== null) {
        mostrarMensajeCatalogo(
            "No puedes eliminar un libro que tiene un préstamo activo.",
            true
        );
        return;
    }

    idLibroAEliminar = idLibro;

    document.getElementById("texto-modal-eliminar").textContent =
        "¿Eliminar «" + libro.titulo + "»?";

    abrirModal("modal-eliminar", document.getElementById("cancelar-eliminar"));
}

// Carga un libro en el formulario para editarlo.
function comenzarEdicion(idLibro) {
    const libro = buscarLibroPorId(idLibro, datosBiblioteca);

    if (!libro) {
        return;
    }

    idLibroEditando = idLibro;
    prepararFormulario(libro);
    mostrarVista("formulario");
    document.getElementById("titulo").focus();
}

// Vuelve el formulario al modo de agregar.
function terminarEdicion() {
    idLibroEditando = null;
    prepararFormulario();
}

document.addEventListener("DOMContentLoaded", function () {
    const campoBusqueda = document.getElementById("buscar-libro");
    const filtroGenero = document.getElementById("filtro-genero");
    const ordenarPor = document.getElementById("ordenar-por");
    const direccionOrden = document.getElementById("direccion-orden");

    aplicarPreferenciasUsuario();

    // Restaurar las preferencias del catálogo.
    campoBusqueda.value = preferenciasCatalogo.busqueda;
    ordenarPor.value = preferenciasCatalogo.ordenarPor;
    direccionOrden.value = preferenciasCatalogo.direccion;

    renderizarCatalogo(datosBiblioteca);
    prepararFormulario();

    // ----- Catálogo: búsqueda, filtros y orden -----

    function aplicarPreferenciasCatalogo() {
        guardarPreferenciasCatalogo(preferenciasCatalogo);
        renderizarCatalogo(datosBiblioteca);
    }

    campoBusqueda.addEventListener("input", function () {
        preferenciasCatalogo.busqueda = campoBusqueda.value;
        aplicarPreferenciasCatalogo();
    });

    filtroGenero.addEventListener("change", function () {
        preferenciasCatalogo.genero = filtroGenero.value;
        aplicarPreferenciasCatalogo();
    });

    ordenarPor.addEventListener("change", function () {
        preferenciasCatalogo.ordenarPor = ordenarPor.value;
        aplicarPreferenciasCatalogo();
    });

    direccionOrden.addEventListener("change", function () {
        preferenciasCatalogo.direccion = direccionOrden.value;
        aplicarPreferenciasCatalogo();
    });

    document.querySelectorAll("[data-filtro]").forEach(function (boton) {
        boton.addEventListener("click", function () {
            preferenciasCatalogo.estado = boton.dataset.filtro;
            aplicarPreferenciasCatalogo();
        });
    });

    // ----- Navegación -----

    document.querySelectorAll("nav [data-vista]").forEach(function (enlace) {
        enlace.addEventListener("click", function (evento) {
            evento.preventDefault();

            // Entrar a "Agregar libro" desde el menú siempre empieza limpio.
            if (enlace.dataset.vista === "formulario") {
                terminarEdicion();
            }

            mostrarVista(enlace.dataset.vista);
        });
    });

    // ----- Botones de las tarjetas (delegación de eventos) -----

    contenedorLibros.addEventListener("click", function (evento) {
        const boton = evento.target.closest("button[data-accion]");

        if (!boton || boton.disabled) {
            return;
        }

        const accion = boton.dataset.accion;
        const idLibro = Number(boton.dataset.id);

        if (accion === "prestar") {
            abrirModalPrestar(idLibro);
        } else if (accion === "devolver") {
            registrarDevolucion(idLibro, "mensaje-catalogo");
        } else if (accion === "eliminar") {
            pedirConfirmacionEliminar(idLibro);
        } else if (accion === "editar") {
            comenzarEdicion(idLibro);
        }
    });

    // Devolver desde la vista "Mis préstamos".
    document.getElementById("lista-prestamos")
        .addEventListener("click", function (evento) {
            const boton = evento.target.closest('button[data-accion="devolver"]');

            if (boton) {
                registrarDevolucion(Number(boton.dataset.id), "mensaje-prestamos");
            }
        });

    // ----- Modal: prestar -----

    document.getElementById("form-prestar")
        .addEventListener("submit", function (evento) {
            evento.preventDefault();

            const campo = document.getElementById("persona-prestamo");

            const resultado = prestarLibro(
                idLibroAPrestar,
                campo.value,
                datosBiblioteca
            );

            // El error del nombre se escribe dentro del modal.
            if (!resultado.ok && resultado.campo === "persona") {
                document.getElementById("error-persona").textContent =
                    resultado.mensaje;
                campo.setAttribute("aria-invalid", "true");
                campo.focus();
                return;
            }

            cerrarModal();
            idLibroAPrestar = null;
            mostrarMensajeCatalogo(resultado.mensaje, !resultado.ok);

            if (resultado.ok) {
                guardarYRenderizar();
            }
        });

    document.getElementById("cancelar-prestar")
        .addEventListener("click", cerrarModal);

    // ----- Modal: eliminar -----

    document.getElementById("confirmar-eliminar")
        .addEventListener("click", function () {
            const resultado = eliminarLibro(idLibroAEliminar, datosBiblioteca);

            if (idLibroEditando === idLibroAEliminar) {
                terminarEdicion();
            }

            cerrarModal();
            idLibroAEliminar = null;
            mostrarMensajeCatalogo(resultado.mensaje, !resultado.ok);

            if (resultado.ok) {
                guardarYRenderizar();
            }
        });

    document.getElementById("cancelar-eliminar")
        .addEventListener("click", cerrarModal);

    // Clic en el fondo oscuro también cierra el modal.
    document.querySelectorAll(".modal").forEach(function (modal) {
        modal.addEventListener("click", function (evento) {
            if (evento.target === modal) {
                cerrarModal();
            }
        });
    });

    // ----- Formulario de libros -----

    const campoComentario = document.getElementById("comentario");

    campoComentario.addEventListener("input", actualizarContadorComentario);

    document.getElementById("cancelar-edicion")
        .addEventListener("click", function () {
            terminarEdicion();
            mostrarVista("catalogo");
        });

    document.getElementById("form-libro")
        .addEventListener("submit", function (evento) {
            evento.preventDefault();

            limpiarErroresFormulario();

            const campos = {
                titulo: document.getElementById("titulo").value,
                autor: document.getElementById("autor").value,
                anio: document.getElementById("anio").value,
                genero: document.getElementById("genero").value,
                comentario: campoComentario.value,
                coleccion: document.getElementById("coleccion").checked
            };

            const resultado = idLibroEditando === null
                ? agregarLibro(datosBiblioteca, campos)
                : editarLibro(idLibroEditando, datosBiblioteca, campos);

            if (!resultado.ok) {
                if (!resultado.errores) {
                    mostrarMensajeFormulario(resultado.mensaje, true);
                    return;
                }

                // Un mensaje debajo de cada campo con error.
                resultado.errores.forEach(function (error) {
                    mostrarErrorCampo(error.campo, error.mensaje);
                });

                // El foco va al primer campo con error.
                document.getElementById(resultado.errores[0].campo).focus();
                return;
            }

            guardarYRenderizar();
            terminarEdicion();
            mostrarVista("catalogo");
            mostrarMensajeCatalogo(resultado.mensaje);
        });

    // ----- Tecla Escape -----

    document.addEventListener("keydown", function (evento) {
        if (evento.key !== "Escape") {
            return;
        }

        // Si hay un modal abierto, Escape solo cierra el modal.
        if (obtenerModalAbierto() !== null) {
            cerrarModal();
            return;
        }

        if (!document.getElementById("formulario").hidden) {
            terminarEdicion();
        }
    });

    // ----- Resumen y ajustes -----

    document.getElementById("guardar-nombre")
        .addEventListener("click", function () {
            preferenciasUsuario.nombre =
                document.getElementById("nombre-usuario").value.trim();

            guardarPreferenciasUsuario(preferenciasUsuario);
            aplicarPreferenciasUsuario();
        });

    document.getElementById("cambiar-tema")
        .addEventListener("click", function () {
            preferenciasUsuario.oscuro = !preferenciasUsuario.oscuro;

            guardarPreferenciasUsuario(preferenciasUsuario);
            aplicarPreferenciasUsuario();
        });

    document.getElementById("restablecer-biblioteca")
        .addEventListener("click", function () {
            datosBiblioteca = restablecerDatos();

            terminarEdicion();
            renderizarCatalogo(datosBiblioteca);
            mostrarVista("catalogo");
            mostrarMensajeCatalogo("Biblioteca restablecida correctamente.");
        });
});
