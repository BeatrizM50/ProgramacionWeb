
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
        "Mostrando " + datos.libros.length +
        " de " + datos.libros.length + " libros";

    actualizarContadorPrestamos(datos);
}
