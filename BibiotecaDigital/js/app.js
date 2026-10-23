
"use strict";

let datosBiblioteca = cargarDatos();

document.addEventListener("DOMContentLoaded", function () {
    renderizarCatalogo(datosBiblioteca);

    
    // Recuperar las preferencias del catálogo.
    let preferenciasCatalogo = cargarPreferenciasCatalogo();

    const campoBusqueda = document.getElementById("buscar-libro");
    const filtroGenero = document.getElementById("filtro-genero");
    const ordenarPor = document.getElementById("ordenar-por");
    const direccionOrden = document.getElementById("direccion-orden");

    // Añadir los géneros existentes al selector.
    const generos = [...new Set(
        datosBiblioteca.libros.map(function (libro) {
            return libro.genero;
        })
    )].sort(function (a, b) {
        return a.localeCompare(b, "es");
    });

    generos.forEach(function (genero) {
        const opcion = document.createElement("option");
        opcion.value = genero;
        opcion.textContent = genero;
        filtroGenero.append(opcion);
    });

    // Restaurar las preferencias.
    campoBusqueda.value = preferenciasCatalogo.busqueda;
    filtroGenero.value = preferenciasCatalogo.genero;
    ordenarPor.value = preferenciasCatalogo.ordenarPor;
    direccionOrden.value = preferenciasCatalogo.direccion;

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
            document.querySelectorAll("[data-filtro]").forEach(function (otro) {
                otro.classList.toggle("activo", otro === boton);
            });

            aplicarPreferenciasCatalogo();
        });
    });

    document.querySelectorAll("[data-filtro]").forEach(function (boton) {
        boton.classList.toggle(
            "activo",
            boton.dataset.filtro === preferenciasCatalogo.estado
        );
    });


    // Estado del formulario: null significa que estamos agregando.
    let idLibroEditando = null;

    const formularioLibro = document.getElementById("form-libro");
    const campoComentario = document.getElementById("comentario");

    // Actualizar el contador mientras se escribe.
    campoComentario.addEventListener("input", actualizarContadorComentario);

    // Mostrar el formulario para agregar un libro.
    document.querySelector('[data-vista="formulario"]')
        .addEventListener("click", function () {
            idLibroEditando = null;
            prepararFormulario();
        });

    // Cancelar una edición y volver al modo de agregar.
    document.getElementById("cancelar-edicion")
        .addEventListener("click", function () {
            idLibroEditando = null;
            prepararFormulario();

            document.querySelector('[data-vista="catalogo"]').click();
        });

    // Guardar un libro nuevo o los cambios de uno existente.
    formularioLibro.addEventListener("submit", function (evento) {
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

        let resultado;

        if (idLibroEditando === null) {
            resultado = agregarLibro(datosBiblioteca, campos);
        } else {
            resultado = editarLibro(
                idLibroEditando,
                datosBiblioteca,
                campos
            );
        }

        if (!resultado.ok) {
            mostrarMensajeFormulario(resultado.mensaje, true);

            // Mostrar el error debajo del campo que corresponda.
            if (resultado.mensaje.includes("título")) {
                mostrarErrorCampo("titulo", resultado.mensaje);
                document.getElementById("titulo").focus();
            } else if (resultado.mensaje.includes("autor")) {
                mostrarErrorCampo("autor", resultado.mensaje);
                document.getElementById("autor").focus();
            } else if (resultado.mensaje.includes("año")) {
                mostrarErrorCampo("anio", resultado.mensaje);
                document.getElementById("anio").focus();
            } else if (resultado.mensaje.includes("género")) {
                mostrarErrorCampo("genero", resultado.mensaje);
                document.getElementById("genero").focus();
            } else if (resultado.mensaje.includes("comentario")) {
                mostrarErrorCampo("comentario", resultado.mensaje);
                campoComentario.focus();
            } else {
                mostrarErrorCampo("titulo", resultado.mensaje);
                document.getElementById("titulo").focus();
            }

            return;
        }

        guardarDatos(datosBiblioteca);
        renderizarCatalogo(datosBiblioteca);

        mostrarMensajeFormulario(resultado.mensaje);

        idLibroEditando = null;
        prepararFormulario();
        document.querySelector('[data-vista="catalogo"]').click();
        mostrarMensajeCatalogo(resultado.mensaje);
    });


    // Navegación entre las cuatro vistas.
    document.querySelectorAll("[data-vista]").forEach(function (enlace) {
        enlace.addEventListener("click", function (evento) {
            evento.preventDefault();

            const vistaDestino = enlace.dataset.vista;

            document.querySelectorAll(".vista").forEach(function (vista) {
                const activa = vista.id === vistaDestino;

                vista.hidden = !activa;
                vista.classList.toggle("activa", activa);
            });

            document.querySelectorAll("[data-vista]").forEach(function (elemento) {
                elemento.classList.toggle("activo", elemento === enlace);
            });
        });
    });

    // Delegación de eventos para los botones de las tarjetas.
    contenedorLibros.addEventListener("click", function (evento) {
        const boton = evento.target.closest("button[data-accion]");

        if (!boton) {
            return;
        }

        const accion = boton.dataset.accion;
        const idLibro = Number(boton.dataset.id);

        if (accion === "prestar") {
            const persona = window.prompt("¿A quién se prestará el libro?");

            if (persona === null) {
                return;
            }

            const resultado = prestarLibro(
                idLibro,
                persona,
                datosBiblioteca
            );

            mostrarMensajeCatalogo(resultado.mensaje);

            if (resultado.ok) {
                guardarDatos(datosBiblioteca);
                renderizarCatalogo(datosBiblioteca);
            }
        }

        if (accion === "devolver") {
            const resultado = devolverLibro(idLibro, datosBiblioteca);

            mostrarMensajeCatalogo(resultado.mensaje);

            if (resultado.ok) {
                guardarDatos(datosBiblioteca);
                renderizarCatalogo(datosBiblioteca);
            }
        }

        if (accion === "eliminar") {
            const resultado = eliminarLibro(idLibro, datosBiblioteca);

            mostrarMensajeCatalogo(resultado.mensaje);

            if (resultado.ok) {
                guardarDatos(datosBiblioteca);
                renderizarCatalogo(datosBiblioteca);
            }
        }

        if (accion === "editar") {
            mostrarMensajeCatalogo(
                "En el siguiente paso conectaremos el botón Editar con el formulario."
            );
        }
    });
});
