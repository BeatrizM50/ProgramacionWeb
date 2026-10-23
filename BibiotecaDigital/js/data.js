
"use strict";

// Devuelve la fecha actual en formato AAAA-MM-DD.
function obtenerFechaActual() {
    const hoy = new Date();

    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

// Suma o resta días a una fecha.
function sumarDias(fecha, cantidad) {
    const resultado = new Date(`${fecha}T12:00:00`);

    resultado.setDate(resultado.getDate() + cantidad);

    const anio = resultado.getFullYear();
    const mes = String(resultado.getMonth() + 1).padStart(2, "0");
    const dia = String(resultado.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

// Crea los libros y préstamos de ejemplo.
function crearDatosIniciales() {
    const hoy = obtenerFechaActual();

    const libros = [
        {
            id: 1,
            titulo: "Cien años de soledad",
            autor: "Gabriel García Márquez",
            anio: 1967,
            genero: "Novela",
            coleccion: false,
            comentario: "Una historia familiar inolvidable."
        },
        {
            id: 2,
            titulo: "Don Quijote de la Mancha",
            autor: "Miguel de Cervantes",
            anio: 1605,
            genero: "Novela",
            coleccion: true,
            comentario: "Edición especial de colección."
        },
        {
            id: 3,
            titulo: "Breve historia del tiempo",
            autor: "Stephen Hawking",
            anio: 1988,
            genero: "Ciencia",
            coleccion: false,
            comentario: "Introducción al universo y al tiempo."
        },
        {
            id: 4,
            titulo: "El principito",
            autor: "Antoine de Saint-Exupéry",
            anio: 1943,
            genero: "Fantasía",
            coleccion: false,
            comentario: "Un clásico sobre la amistad."
        },
        {
            id: 5,
            titulo: "Historia de Cuba",
            autor: "Fernando Portuondo",
            anio: 1965,
            genero: "Historia",
            coleccion: true,
            comentario: "Ejemplar reservado para colección."
        },
        {
            id: 6,
            titulo: "Asesinato en el Orient Express",
            autor: "Agatha Christie",
            anio: 1934,
            genero: "Misterio",
            coleccion: false,
            comentario: "Una investigación de Hércules Poirot."
        },
        {
            id: 7,
            titulo: "La ciudad y los perros",
            autor: "Mario Vargas Llosa",
            anio: 1963,
            genero: "Novela",
            coleccion: false,
            comentario: "Novela ambientada en un colegio militar."
        },
        {
            id: 8,
            titulo: "El mundo y sus demonios",
            autor: "Carl Sagan",
            anio: 1995,
            genero: "Ciencia",
            coleccion: false,
            comentario: "Una defensa del pensamiento científico."
        }
    ];

    const prestamos = [
        {
            id: 1,
            idLibro: 1,
            persona: "Ana Pérez",
            fechaPrestamo: sumarDias(hoy, -18),
            fechaLimite: sumarDias(hoy, -4),
            fechaDevolucion: null
        },
        {
            id: 2,
            idLibro: 3,
            persona: "Carlos Díaz",
            fechaPrestamo: sumarDias(hoy, -5),
            fechaLimite: sumarDias(hoy, 9),
            fechaDevolucion: null
        },
        {
            id: 3,
            idLibro: 4,
            persona: "Laura Gómez",
            fechaPrestamo: sumarDias(hoy, -20),
            fechaLimite: sumarDias(hoy, -6),
            fechaDevolucion: sumarDias(hoy, -7)
        },
        {
            id: 4,
            idLibro: 6,
            persona: "Pedro Ruiz",
            fechaPrestamo: sumarDias(hoy, -25),
            fechaLimite: sumarDias(hoy, -11),
            fechaDevolucion: sumarDias(hoy, -8)
        }
    ];

    return { libros, prestamos };
}
