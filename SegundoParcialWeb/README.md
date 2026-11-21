# Taller de reparaciones — React + PocketBase

Sistema de gestión para un taller que repara equipos electrónicos (teléfonos,
laptops, televisores). La interfaz está hecha con **React (Vite + React Router)**
y el servidor con **PocketBase**.

El sistema no tiene autenticación: el personal del taller es el único usuario.

## Requisitos

- **Node.js** (18 o superior) para el frontend.
- **PocketBase** (`pocketbase.exe` para Windows), descargado de
  <https://github.com/pocketbase/pocketbase/releases>. Este proyecto se probó
  con la versión **0.40.x**. Descarga el zip `windows_amd64`, descomprímelo y
  deja el ejecutable dentro de la carpeta `backend/`.

## Estructura

```
SegundoParcialWeb/
├── backend/
│   ├── pocketbase.exe        # ejecutable (no se sube al repositorio)
│   ├── pb_migrations/        # esquema de datos como código
│   │   ├── 1794850000_crear_colecciones.js
│   │   └── 1794850001_datos_iniciales.js
│   ├── pb_hooks/main.pb.js   # validaciones de las etapas
│   └── pb_data/              # base de datos generada (no se sube)
└── frontend/
    └── src/                  # aplicación React
```

## Cómo levantar el backend (PocketBase)

Desde la carpeta `backend/`:

1. Crea el superusuario (solo la primera vez):

   ```
   .\pocketbase.exe superuser upsert admin@ejemplo.cu 1234567890
   ```

2. Arranca el servidor:

   ```
   .\pocketbase.exe serve
   ```

3. PocketBase queda escuchando en `http://127.0.0.1:8090` y su panel de
   administración en `http://127.0.0.1:8090/_/`.

Al arrancar, PocketBase aplica automáticamente las migraciones de
`pb_migrations/`: crea las colecciones `clientes`, `ordenes` y `eventos`, y
carga los datos iniciales de prueba (ver abajo).

## Cómo levantar el frontend (React)

Desde la carpeta `frontend/`:

```
npm install
npm run dev
```

La aplicación queda disponible en la URL que imprime Vite (por defecto
`http://localhost:5173`). El frontend habla con PocketBase en
`http://127.0.0.1:8090` (constante `API_BASE` en
`src/services/pocketbase.js`).

## Datos de prueba

La migración `1794850001_datos_iniciales.js` crea automáticamente:

- 2 clientes: Carlos Pérez y María Rodríguez.
- 3 órdenes en etapas distintas: una `solicitada`, una `en_reparacion` y una
  `lista`, con su presupuesto e historial de eventos.

## Modelo de datos

| Colección | Campos |
|-----------|--------|
| `clientes` | `nombre`, `telefono` |
| `ordenes`  | `cliente` (relación a clientes), `equipo`, `problema`, `estado`, `diagnostico`, `manoObra`, `piezas` (json), `fotos` (archivos, hasta 3) |
| `eventos`  | `orden` (relación a ordenes), `de`, `a`, `created` |

Los valores de `estado` son: `solicitada`, `en_diagnostico`, `presupuestada`,
`aprobada`, `rechazada`, `en_reparacion`, `lista`, `entregada`, `cancelada`.

## Etapas de una orden

```
solicitada → en_diagnostico → presupuestada → aprobada → en_reparacion → lista → entregada
     │                            │
     └── cancelada                └── rechazada
```

Estas transiciones (y ninguna otra) las valida el hook
`backend/pb_hooks/main.pb.js`. El mismo hook registra un evento en `eventos`
por cada cambio de etapa, garantiza que el presupuesto (diagnóstico, mano de
obra y piezas) se fije al presupuestar y no pueda modificarse después, y fuerza
que toda orden nueva nazca en `solicitada` sin presupuesto (nadie puede saltarse
etapas creando una orden ya avanzada).

## Reglas de acceso

No hay autenticación, pero las API rules bloquean lo que nunca debe ocurrir:

- No se pueden **borrar** órdenes ni clientes.
- Los eventos del historial **no se pueden editar ni borrar** (solo crear).

## Verificación rápida

```bash
# salud de la API
curl http://127.0.0.1:8090/api/health

# listar órdenes con el cliente expandido
curl "http://127.0.0.1:8090/api/collections/ordenes/records?expand=cliente"
```
