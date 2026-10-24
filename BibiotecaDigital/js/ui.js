
"use strict";

// Referencia al contenedor del catálogo.
const contenedorLibros = document.getElementById("lista-libros");

// Muestra un mensaje debajo del catálogo.
function mostrarMensajeCatalogo(mensaje) {
    const elemento = document.getElementById("mensaje-catalogo");
    elemento.textContent = mensaje;
}

// Crea un elemento HTML con texto seguro.
function crearElemento(etiqueta, texto, clase) {
    const elemento = document.createElement(etiqueta);
    elemento.textContent = texto;

    if (clase) {
        elemento.className = clase;
    }

    return elemento;
}

// Actualiza el número de préstamos activos del menú.
function actualizarContadorPrestamos(datos) {
    document.getElementById("contador-prestamos").textContent =
        contarPrestamosActivos(datos.prestamos);
}

// Dibuja las tarjetas de los libros.
function renderizarCatalogo(datos) {
    contenedorLibros.replaceChildren();

const librosVisibles = obtenerLibrosFiltrados(
    datos,
    preferenciasCatalogo
);


    datos.libros.forEach(function (libro) {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-libro";

        const titulo = crearElemento("h3", libro.titulo);
        const autor = crearElemento("p", "Autor: " + libro.autor);
        const anio = crearElemento("p", "Año: " + libro.anio);
        const genero = crearElemento("p", "Género: " + libro.genero);

        tarjeta.append(titulo, autor, anio, genero);

        if (libro.coleccion) {
            tarjeta.append(
                crearElemento("p", "Ejemplar de colección", "etiqueta-estado")
            );
        } else {
            const prestamo = buscarPrestamoActivo(
                libro.id,
                datos.prestamos
            );

            if (prestamo) {
                tarjeta.append(
                    crearElemento(
                        "p",
                        "Prestado a: " + prestamo.persona
                    ),
                    crearElemento(
                        "p",
                        "Fecha límite: " + prestamo.fechaLimite
                    )
                );

                if (prestamoVencido(prestamo)) {
                    tarjeta.append(
                        crearElemento(
                            "p",
                            "Vencido: " + calcularDiasRetraso(prestamo) +
                            " día(s) de retraso",
                            "etiqueta-vencido"
                        )
                    );
                } else {
                    tarjeta.append(
                        crearElemento("p", "Estado: Prestado", "etiqueta-estado")
                    );
                }
            } else {
                tarjeta.append(
                    crearElemento("p", "Estado: Disponible", "etiqueta-estado")
                );
            }
        }

        const acciones = document.createElement("div");
        acciones.className = "acciones-libro";

        if (!libro.coleccion) {
            const prestamo = buscarPrestamoActivo(
                libro.id,
                datos.prestamos
            );

            if (prestamo) {
                const botonDevolver = crearElemento("button", "Devolver");
                botonDevolver.type = "button";
                botonDevolver.dataset.accion = "devolver";
                botonDevolver.dataset.id = libro.id;
                acciones.append(botonDevolver);
            } else {
                const botonPrestar = crearElemento("button", "Prestar");
                botonPrestar.type = "button";
                botonPrestar.dataset.accion = "prestar";
                botonPrestar.dataset.id = libro.id;
                acciones.append(botonPrestar);
            }
        }

        const botonEditar = crearElemento("button", "Editar");
        botonEditar.type = "button";
        botonEditar.dataset.accion = "editar";
        botonEditar.dataset.id = libro.id;

        const botonEliminar = crearElemento("button", "Eliminar");
        botonEliminar.type = "button";
        botonEliminar.dataset.accion = "eliminar";
        botonEliminar.dataset.id = libro.id;

        acciones.append(botonEditar, botonEliminar);
        tarjeta.append(acciones);
        contenedorLibros.append(tarjeta);
    });

    document.getElementById("contador-libros").textContent =
    "Mostrando " + librosVisibles.length +
    " de " + datos.libros.length + " libros";

    actualizarContadorPrestamos(datos);
    renderizarPrestamos(datos);

}

function mostrarMensajeFormulario(mensaje, esError = false) {
    const elemento = document.getElementById("mensaje-formulario");

    elemento.textContent = mensaje;
    elemento.classList.toggle("mensaje-error", esError);
    elemento.classList.toggle("mensaje-exito", !esError);
}

function limpiarErroresFormulario() {
    ["titulo", "autor", "anio", "genero", "comentario", "coleccion"]
        .forEach(function (campo) {
            const error = document.getElementById("error-" + campo);

            if (error) {
                error.textContent = "";
            }
        });

    document.querySelectorAll("#form-libro input, #form-libro select, #form-libro textarea")
        .forEach(function (campo) {
            campo.removeAttribute("aria-invalid");
        });
}

function mostrarErrorCampo(campo, mensaje) {
    const error = document.getElementById("error-" + campo);

    if (error) {
        error.textContent = mensaje;
    }

    const control = document.getElementById(campo);

    if (control) {
        control.setAttribute("aria-invalid", "true");
    }
}

function prepararFormulario(libro = null) {
    const formulario = document.getElementById("form-libro");

    formulario.reset();
    limpiarErroresFormulario();

    document.getElementById("mensaje-formulario").textContent = "";

    const editando = libro !== null;

    document.getElementById("titulo-formulario").textContent =
        editando ? "Editar libro" : "Agregar un libro";

    document.getElementById("guardar-libro").textContent =
        editando ? "Guardar cambios" : "Agregar libro";

    document.getElementById("cancelar-edicion").hidden = !editando;

    if (editando) {
        document.getElementById("titulo").value = libro.titulo;
        document.getElementById("autor").value = libro.autor;
        document.getElementById("anio").value = libro.anio;
        document.getElementById("genero").value = libro.genero;
        document.getElementById("comentario").value = libro.comentario || "";
        document.getElementById("coleccion").checked = libro.coleccion;
    }

    actualizarContadorComentario();
}

function actualizarContadorComentario() {
    const comentario = document.getElementById("comentario");
    const restantes = 120 - comentario.value.length;

    document.getElementById("contador-comentario").textContent =
        restantes + " caracteres restantes";
}


function renderizarPrestamos(datos) {
    const contenedorActivos = document.getElementById("lista-prestamos");
    const contenedorHistorial = document.getElementById("historial-prestamos");

    contenedorActivos.replaceChildren();
    contenedorHistorial.replaceChildren();

    // Seleccionar y ordenar los préstamos activos.
    const activos = datos.prestamos
        .filter(prestamoActivo)
        .slice()
        .sort(function (a, b) {
            return a.fechaLimite.localeCompare(b.fechaLimite);
        });

    if (activos.length === 0) {
        contenedorActivos.append(
            crearElemento("p", "No hay préstamos activos.")
        );
    }

    activos.forEach(function (prestamo) {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-libro";

        const libro = buscarLibroPorId(prestamo.idLibro, datos);

        if (!libro) {
            return;
        }

        tarjeta.append(
            crearElemento("h4", libro.titulo),
            crearElemento("p", "Persona: " + prestamo.persona),
            crearElemento("p", "Fecha de préstamo: " + prestamo.fechaPrestamo),
            crearElemento("p", "Fecha límite: " + prestamo.fechaLimite)
        );

        if (prestamoVencido(prestamo)) {
            tarjeta.append(
                crearElemento(
                    "p",
                    "Vencido por " + calcularDiasRetraso(prestamo) + " día(s)",
                    "etiqueta-vencido"
                )
            );
        } else {
            tarjeta.append(
                crearElemento("p", "Dentro del plazo", "etiqueta-estado")
            );
        }

        const botonDevolver = crearElemento("button", "Registrar devolución");
        botonDevolver.type = "button";
        botonDevolver.dataset.accion = "devolver";
        botonDevolver.dataset.id = prestamo.idLibro;

        tarjeta.append(botonDevolver);
        contenedorActivos.append(tarjeta);
    });

    // El historial contiene solamente préstamos ya devueltos.
    const historial = datos.prestamos
        .filter(function (prestamo) {
            return !prestamoActivo(prestamo);
        })
        .slice()
        .sort(function (a, b) {
            return b.fechaDevolucion.localeCompare(a.fechaDevolucion);
        });

    if (historial.length === 0) {
        contenedorHistorial.append(
            crearElemento("p", "Todavía no hay devoluciones registradas.")
        );
    }

    historial.forEach(function (prestamo) {
        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-libro";

        const libro = buscarLibroPorId(prestamo.idLibro, datos);

        if (!libro) {
            return;
        }

        tarjeta.append(
            crearElemento("h4", libro.titulo),
            crearElemento("p", "Persona: " + prestamo.persona),
            crearElemento("p", "Fecha de préstamo: " + prestamo.fechaPrestamo),
            crearElemento("p", "Fecha límite: " + prestamo.fechaLimite),
            crearElemento("p", "Fecha de devolución: " + prestamo.fechaDevolucion)
        );

        if (prestamo.fechaDevolucion > prestamo.fechaLimite) {
            const limite = new Date(prestamo.fechaLimite + "T12:00:00");
            const devolucion = new Date(prestamo.fechaDevolucion + "T12:00:00");

            const dias = Math.round(
                (devolucion - limite) / (1000 * 60 * 60 * 24)
            );

            tarjeta.append(
                crearElemento("p", "Devuelto con " + dias + " día(s) de retraso")
            );
        } else {
            tarjeta.append(
                crearElemento("p", "Devuelto a tiempo", "etiqueta-estado")
            );
        }

        contenedorHistorial.append(tarjeta);
    });
}

