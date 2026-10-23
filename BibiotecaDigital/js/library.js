
"use strict";

// Comprueba si un préstamo sigue activo.
function prestamoActivo(prestamo) {
    return prestamo.fechaDevolucion === null;
}

// Busca el préstamo activo de un libro.
function buscarPrestamoActivo(idLibro, prestamos) {
    return prestamos.find(function (prestamo) {
        return prestamo.idLibro === idLibro &&
               prestamoActivo(prestamo);
    }) || null;
}

// Comprueba si la fecha límite ya pasó.
function prestamoVencido(prestamo) {
    if (!prestamoActivo(prestamo)) {
        return false;
    }

    return prestamo.fechaLimite < obtenerFechaActual();
}

// Calcula los días de retraso.
function calcularDiasRetraso(prestamo) {
    if (!prestamoVencido(prestamo)) {
        return 0;
    }

    const fechaLimite = new Date(
        `${prestamo.fechaLimite}T12:00:00`
    );

    const hoy = new Date(
        `${obtenerFechaActual()}T12:00:00`
    );

    const diferencia = hoy.getTime() - fechaLimite.getTime();

    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

// Determina si un libro está disponible.
function libroDisponible(libro, datos) {
    if (libro.coleccion) {
        return false;
    }

    return buscarPrestamoActivo(libro.id, datos.prestamos) === null;
}

// Cuenta los préstamos que todavía no se han devuelto.
function contarPrestamosActivos(prestamos) {
    return prestamos.filter(prestamoActivo).length;
}

// Cuenta los préstamos vencidos.
function contarPrestamosVencidos(prestamos) {
    return prestamos.filter(prestamoVencido).length;
}

// Obtiene el siguiente identificador para un libro.
function siguienteIdLibro(libros) {
    if (libros.length === 0) {
        return 1;
    }

    return Math.max(...libros.map(function (libro) {
        return libro.id;
    })) + 1;
}

// Obtiene el siguiente identificador para un préstamo.
function siguienteIdPrestamo(prestamos) {
    if (prestamos.length === 0) {
        return 1;
    }

    return Math.max(...prestamos.map(function (prestamo) {
        return prestamo.id;
    })) + 1;
}
