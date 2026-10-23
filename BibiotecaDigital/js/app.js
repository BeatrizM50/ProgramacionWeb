
"use strict";

let datosBiblioteca = cargarDatos();

document.addEventListener("DOMContentLoaded", function () {
    renderizarCatalogo(datosBiblioteca);

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
