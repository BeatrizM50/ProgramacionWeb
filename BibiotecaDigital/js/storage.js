
"use strict";

// Nombre de la clave donde guardaremos los datos.
const CLAVE_BIBLIOTECA = "bibliotecaDigitalDatos";

// Guarda los libros y los préstamos en localStorage.
function guardarDatos(datos) {
    const datosJSON = JSON.stringify(datos);

    localStorage.setItem(CLAVE_BIBLIOTECA, datosJSON);
}

// Recupera los datos guardados o crea los iniciales.
function cargarDatos() {
    const datosGuardados = localStorage.getItem(CLAVE_BIBLIOTECA);

    if (datosGuardados !== null) {
        try {
            return JSON.parse(datosGuardados);
        } catch (error) {
            console.error("No se pudieron leer los datos guardados.", error);
        }
    }

    const datosIniciales = crearDatosIniciales();

    guardarDatos(datosIniciales);

    return datosIniciales;
}

// Elimina los datos guardados y vuelve a crear los iniciales.
function restablecerDatos() {
    const datosIniciales = crearDatosIniciales();

    guardarDatos(datosIniciales);

    return datosIniciales;
}


const CLAVE_PREFERENCIAS_CATALOGO = "bibliotecaDigitalPreferenciasCatalogo";

function cargarPreferenciasCatalogo() {
    const guardadas = localStorage.getItem(CLAVE_PREFERENCIAS_CATALOGO);

    const predeterminadas = {
        busqueda: "",
        genero: "todos",
        estado: "todos",
        ordenarPor: "titulo",
        direccion: "asc"
    };

    if (guardadas === null) {
        return predeterminadas;
    }

    try {
        return {
            ...predeterminadas,
            ...JSON.parse(guardadas)
        };
    } catch (error) {
        console.error("No se pudieron cargar las preferencias.", error);
        return predeterminadas;
    }
}

function guardarPreferenciasCatalogo(preferencias) {
    localStorage.setItem(
        CLAVE_PREFERENCIAS_CATALOGO,
        JSON.stringify(preferencias)
    );
}


// Preferencias del usuario: nombre y tema oscuro.
const CLAVE_PREFERENCIAS_USUARIO = "bibliotecaDigitalPreferenciasUsuario";

function cargarPreferenciasUsuario() {
    const guardadas = localStorage.getItem(CLAVE_PREFERENCIAS_USUARIO);

    const predeterminadas = {
        nombre: "",
        oscuro: false
    };

    if (guardadas === null) {
        return predeterminadas;
    }

    try {
        return {
            ...predeterminadas,
            ...JSON.parse(guardadas)
        };
    } catch (error) {
        console.error("No se pudieron cargar las preferencias del usuario.", error);
        return predeterminadas;
    }
}

function guardarPreferenciasUsuario(preferencias) {
    localStorage.setItem(
        CLAVE_PREFERENCIAS_USUARIO,
        JSON.stringify(preferencias)
    );
}
