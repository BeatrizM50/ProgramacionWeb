
"use strict";

// Año máximo permitido para un libro (según el enunciado).
const ANIO_MAXIMO = 2026;

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


function buscarLibroPorId(idLibro, datos) {
    return datos.libros.find(function (libro) {
        return libro.id === idLibro;
    }) || null;
}

// Comprueba si ya existe un libro con el mismo título y autor.
function existeLibroDuplicado(titulo, autor, datos, idExcluir = null) {
    const tituloNormalizado = titulo.trim().toLocaleLowerCase("es");
    const autorNormalizado = autor.trim().toLocaleLowerCase("es");

    return datos.libros.some(function (libro) {
        return libro.id !== idExcluir &&
            libro.titulo.trim().toLocaleLowerCase("es") === tituloNormalizado &&
            libro.autor.trim().toLocaleLowerCase("es") === autorNormalizado;
    });
}

// Valida los campos del formulario (al agregar y al editar).
// Devuelve una lista con un error por cada campo incorrecto.
function validarCamposLibro(campos, datos, idExcluir = null) {
    const errores = [];
    const titulo = campos.titulo.trim();
    const autor = campos.autor.trim();
    const anio = Number(campos.anio);
    const comentario = (campos.comentario || "").trim();

    if (titulo.length < 3 || titulo.length > 60) {
        errores.push({ campo: "titulo", mensaje: "El título debe tener entre 3 y 60 caracteres." });
    }

    if (!autor) {
        errores.push({ campo: "autor", mensaje: "El autor es obligatorio." });
    }

    if (!Number.isInteger(anio) || anio < 1000 || anio > ANIO_MAXIMO) {
        errores.push({ campo: "anio", mensaje: `El año debe estar entre 1000 y ${ANIO_MAXIMO}.` });
    }

    if (!campos.genero) {
        errores.push({ campo: "genero", mensaje: "Debes seleccionar un género." });
    }

    if (comentario.length > 120) {
        errores.push({ campo: "comentario", mensaje: "El comentario no puede superar los 120 caracteres." });
    }

    // El duplicado solo se revisa si título y autor son válidos.
    const tituloOAutorInvalido = errores.some(function (error) {
        return error.campo === "titulo" || error.campo === "autor";
    });

    if (!tituloOAutorInvalido && existeLibroDuplicado(titulo, autor, datos, idExcluir)) {
        errores.push({ campo: "titulo", mensaje: "Ya existe un libro con ese título y autor." });
    }

    // Un libro prestado no puede pasar a ser de colección.
    if (idExcluir !== null &&
        campos.coleccion &&
        buscarPrestamoActivo(idExcluir, datos.prestamos) !== null) {
        errores.push({ campo: "coleccion", mensaje: "No puedes convertir en libro de colección un libro prestado." });
    }

    return errores;
}

// Agrega un libro nuevo.
function agregarLibro(datos, campos) {
    const errores = validarCamposLibro(campos, datos);

    if (errores.length > 0) {
        return { ok: false, errores: errores, mensaje: errores[0].mensaje };
    }

    const libro = {
        id: siguienteIdLibro(datos.libros),
        titulo: campos.titulo.trim(),
        autor: campos.autor.trim(),
        anio: Number(campos.anio),
        genero: campos.genero,
        coleccion: Boolean(campos.coleccion),
        comentario: (campos.comentario || "").trim()
    };

    datos.libros.push(libro);

    return { ok: true, mensaje: "Libro agregado correctamente.", libro: libro };
}

// Edita un libro existente.
function editarLibro(idLibro, datos, campos) {
    const libro = buscarLibroPorId(idLibro, datos);

    if (!libro) {
        return { ok: false, mensaje: "No se encontró el libro." };
    }

    const errores = validarCamposLibro(campos, datos, idLibro);

    if (errores.length > 0) {
        return { ok: false, errores: errores, mensaje: errores[0].mensaje };
    }

    libro.titulo = campos.titulo.trim();
    libro.autor = campos.autor.trim();
    libro.anio = Number(campos.anio);
    libro.genero = campos.genero;
    libro.comentario = (campos.comentario || "").trim();
    libro.coleccion = Boolean(campos.coleccion);

    return { ok: true, mensaje: "Libro actualizado correctamente.", libro: libro };
}

// Elimina un libro y su historial de préstamos devueltos.
function eliminarLibro(idLibro, datos) {
    const libro = buscarLibroPorId(idLibro, datos);

    if (!libro) {
        return { ok: false, mensaje: "No se encontró el libro." };
    }

    if (buscarPrestamoActivo(idLibro, datos.prestamos) !== null) {
        return {
            ok: false,
            mensaje: "No puedes eliminar un libro que tiene un préstamo activo."
        };
    }

    datos.libros = datos.libros.filter(function (elemento) {
        return elemento.id !== idLibro;
    });

    datos.prestamos = datos.prestamos.filter(function (prestamo) {
        return prestamo.idLibro !== idLibro;
    });

    return { ok: true, mensaje: "Libro eliminado correctamente." };
}

// Registra un préstamo con un plazo de 14 días.
function prestarLibro(idLibro, persona, datos) {
    const libro = buscarLibroPorId(idLibro, datos);
    const nombrePersona = persona.trim();

    if (!libro) {
        return { ok: false, mensaje: "No se encontró el libro." };
    }

    if (nombrePersona.length < 2 || nombrePersona.length > 40) {
        return {
            ok: false,
            campo: "persona",
            mensaje: "El nombre debe tener entre 2 y 40 caracteres."
        };
    }

    if (libro.coleccion) {
        return { ok: false, mensaje: "Los libros de colección no se pueden prestar." };
    }

    if (!libroDisponible(libro, datos)) {
        return { ok: false, mensaje: "Este libro no está disponible." };
    }

    if (contarPrestamosActivos(datos.prestamos) >= 3) {
        return { ok: false, mensaje: "No puede haber más de 3 préstamos activos." };
    }

    const hoy = obtenerFechaActual();

    const prestamo = {
        id: siguienteIdPrestamo(datos.prestamos),
        idLibro: idLibro,
        persona: nombrePersona,
        fechaPrestamo: hoy,
        fechaLimite: sumarDias(hoy, 14),
        fechaDevolucion: null
    };

    datos.prestamos.push(prestamo);

    return { ok: true, mensaje: "Préstamo registrado correctamente.", prestamo: prestamo };
}

// Devuelve un libro sin borrar el préstamo de la colección.
function devolverLibro(idLibro, datos) {
    const prestamo = buscarPrestamoActivo(idLibro, datos.prestamos);

    if (!prestamo) {
        return { ok: false, mensaje: "Este libro no tiene un préstamo activo." };
    }

    const hoy = obtenerFechaActual();
    prestamo.fechaDevolucion = hoy;

    if (hoy > prestamo.fechaLimite) {
        const dias = Math.floor(
            (new Date(`${hoy}T12:00:00`) -
             new Date(`${prestamo.fechaLimite}T12:00:00`)) /
            (1000 * 60 * 60 * 24)
        );

        return {
            ok: true,
            mensaje: `Libro devuelto con ${dias} día(s) de retraso.`,
            prestamo: prestamo
        };
    }

    return {
        ok: true,
        mensaje: "Libro devuelto a tiempo.",
        prestamo: prestamo
    };
}


function obtenerLibrosFiltrados(datos, preferencias) {
    const busqueda = preferencias.busqueda
        .trim()
        .toLocaleLowerCase("es");

    const resultado = datos.libros.filter(function (libro) {
        const coincideBusqueda =
            libro.titulo.toLocaleLowerCase("es").includes(busqueda) ||
            libro.autor.toLocaleLowerCase("es").includes(busqueda);

        const coincideGenero =
            preferencias.genero === "todos" ||
            libro.genero === preferencias.genero;

        const prestamo = buscarPrestamoActivo(
            libro.id,
            datos.prestamos
        );

        let coincideEstado = true;

        if (preferencias.estado === "disponibles") {
            coincideEstado = libroDisponible(libro, datos);
        } else if (preferencias.estado === "prestados") {
            coincideEstado = prestamo !== null;
        }

        return coincideBusqueda && coincideGenero && coincideEstado;
    });

    resultado.sort(function (a, b) {
        let comparacion;

        if (preferencias.ordenarPor === "anio") {
            comparacion = a.anio - b.anio;
        } else if (preferencias.ordenarPor === "autor") {
            comparacion = a.autor.localeCompare(b.autor, "es");
        } else {
            comparacion = a.titulo.localeCompare(b.titulo, "es");
        }

        return preferencias.direccion === "desc"
            ? -comparacion
            : comparacion;
    });

    return resultado;
}

