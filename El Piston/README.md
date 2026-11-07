# El Pistón · Taller Automotriz

Sistema web de gestión para un taller mecánico construido con **PocketBase** (servidor backend) y un cliente en HTML/CSS/JS vanilla. Incluye dashboard, gestión de órdenes de servicio, clientes, vehículos, inventario de repuestos, mecánicos y reportes financieros.

> Proyecto desarrollado para la actividad de PocketBase Web. Moneda en dólares (`$`). Paleta: rojo competición.

---

## Estructura del repositorio

```
El Piston/
├── client/                 # Cliente web (HTML/CSS/JS vanilla)
│   ├── index.html          # Shell de la app: sidebar, topbar, área de contenido
│   ├── assets/
│   │   ├── css/app.css     # Sistema visual completo (responsive, imprimible)
│   │   ├── js/app.js       # Router, navegación, badges, fecha
│   │   ├── js/api.js       # SDK de PocketBase, carga de datos, lógica de stock
│   │   ├── js/actions.js   # Formularios y modales (órdenes, clientes, vehículos, pagos…)
│   │   ├── js/ui.js        # Utilidades de UI (modal, toast, dinero, fechas, estados)
│   │   ├── js/icons.js     # Íngenía SVG inline
│   │   ├── js/views/*.js   # Vistas: dashboard, órdenes, clientes, vehículos, inventario, mecánicos, reportes
│   │   ├── fonts/          # Tipografías locales (Inter, Barlow Condensed)
│   │   └── vendor/
│   │       └── pocketbase.es.mjs   # SDK de PocketBase v0.28.2 (vendado)
│   └── ...
├── server/                 # Servidor PocketBase
│   ├── pocketbase.exe      # Binario de PocketBase v0.40.6 (descargar por separado)
│   ├── pb_migrations/      # Migraciones de esquema + seed de datos demo
│   ├── pb_hooks/           # Hooks (vacío, reservado)
│   └── pb_data/            # Base de datos SQLite (generada, ignorada en Git)
├── capturas/               # Capturas de pantalla del funcionamiento
│   ├── 01-panel.jpeg
│   ├── 02-ordenes-detalle.jpeg
│   ├── 03-ordenes-lista.jpeg
│   ├── 04-clientes.jpeg
│   ├── 05-vehiculos.jpeg
│   ├── 06-inventario.jpeg
│   ├── 07-mecanicos.jpeg
│   └── 08-reportes.jpeg
├── README.md
└── .gitignore
```

---

## Decisiones de diseño

### Modelo de datos y relaciones

| Colección | Campo clave | Relaciones |
|-----------|-------------|------------|
| `clientes` | id | 1:N con `vehiculos` y `ordenes` |
| `mecanicos` | id | 1:N con `ordenes` |
| `vehiculos` | id | N:1 con `clientes`; 1:N con `ordenes` |
| `repuestos` | id | 1:N con `orden_repuestos` |
| `ordenes` | id | N:1 con `vehiculos`, `mecanicos`; 1:N con `orden_trabajos`, `orden_repuestos`, `pagos` |
| `orden_trabajos` | id | N:1 con `ordenes` (mano de obra) |
| `orden_repuestos` | id | N:1 con `ordenes` y `repuestos` (partes usadas) |
| `pagos` | id | N:1 con `ordenes` |

### Reglas de acceso (demo)

No hay autenticación. Todas las reglas (`listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`) están vacías (`""`) para permitir operaciones públicas en el demo. Esto documenta intencionalmente que **es solo para entorno de demostración/local**; en producción se debe habilitar autenticación y reglas apropiadas.

### Moneda

Todas las cantidades monetarias están en **dólares (`$`)** y se formatean con:

```js
`$${Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(value)}`
```

Resultado ejemplo: `$407 000`.

Los valores del seed de datos se escriben en miles para facilitar su lectura y se multiplican por 1.000 al guardarse (ver `1793978200_seed_demo.js`).

### Stock

El descuento y restauración de stock se maneja desde el cliente en `api.js` (`addPartToOrder`, `removePartFromOrder`, `deleteOrder`) para evitar depender de hooks del servidor y prevenir dobles decrementos.

### Validación de formularios

Todos los formularios (clientes, vehículos, mecánicos, repuestos, órdenes, trabajos, repuestos en orden, pagos y ajustes de stock) validan sus campos antes de guardar (`validateForm` en `ui.js`):

- Los campos obligatorios se marcan con un asterisco (`*`) y bloquean el envío si están vacíos.
- Los campos inválidos se resaltan en rojo con un mensaje de error bajo el campo y un aviso (toast).
- Validaciones específicas: teléfono (7–20 números), año del vehículo (1950–2100), longitudes mínimas de texto, cantidades y precios no negativos, y monto del pago entre 1 y el saldo pendiente.

---

## Requisitos previos

1. **PocketBase v0.40.6**: descarga `pocketbase.exe` desde https://pocketbase.io y colócalo en `server/pocketbase.exe`.
2. **Node.js** (opcional, solo si quieres ejecutar el helper de creación de colecciones).
3. Puerto `8091` libre (el servidor se ejecuta en `http://127.0.0.1:8091`).

> Nota: en este entorno el puerto `8090` está ocupado por otro proceso de PocketBase no relacionado; por eso se usa `8091`.

---

## Pasos para ejecutar

### 1. Iniciar el servidor

Desde la carpeta `server/`:

```powershell
.\pocketbase.exe serve --http=127.0.0.1:8091 --publicDir=../client --migrationsDir=./pb_migrations --hooksDir=./pb_hooks --automigrate
```

La primera vez se creará el superusuario. Crea la cuenta administrativa:

```powershell
.\pocketbase.exe superuser upsert admin@elpiston.local 'Piston2026!'
```

### 2. Acceder al cliente

Abre en el navegador:

```
http://127.0.0.1:8091/
```

La app carga directamente (`index.html` se sirve desde `publicDir`).

### 3. Panel de administración de PocketBase

```
http://127.0.0.1:8091/_/
```

Credenciales del superusuario:
- **Email:** `admin@elpiston.local`
- **Contraseña:** `Piston2026!`

---

## Credenciales de demostración

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador (PocketBase) | admin@elpiston.local | Piston2026! |

La aplicación cliente **no requiere login** (topbar estático "Recepción / Mostrador"). Los datos de seed incluyen:

- 8 clientes
- 10 vehículos
- 3 mecánicos
- 17 repuestos
- 14 órdenes de servicio
- 13 trabajos de mano de obra
- 16 repuestos usados
- 12 pagos

Para resetear la base de datos a los datos iniciales: detén PocketBase, elimina `server/pb_data/` y vuelve a iniciar. Las migraciones se aplican automáticamente.

---

## Capturas de pantalla

Todas las capturas están en `capturas/`:

| Archivo | Vista |
|---------|-------|
| `01-panel.jpeg` | Panel de control (KPIs, flujo, carga de mecánicos, caja, bajo stock) |
| `02-ordenes-detalle.jpeg` | Detalle de orden (flujos, mano de obra, repuestos, pagos, totales) |
| `03-ordenes-lista.jpeg` | Lista de órdenes con filtros y saldos |
| `04-clientes.jpeg` | Directorio de clientes con saldos y últimas visitas |
| `05-vehiculos.jpeg` | Flota de vehículos con historial |
| `06-inventario.jpeg` | Inventario de repuestos con alertas de bajo stock |
| `07-mecanicos.jpeg` | Carga de trabajo por mecánico |
| `08-reportes.jpeg` | Reportes: facturación, métodos de pago, órdenes por estado, cuentas por cobrar, alertas de inventario |

---

## Scripts del servidor

### `server/pb_migrations/`

Migraciones generadas automáticamente y renombradas secuencialmente para respetar dependencias de relaciones:

1. `1793978150_created_clientes.js`
2. `1793978151_created_mecanicos.js`
3. `1793978152_created_vehiculos.js`
4. `1793978153_created_repuestos.js`
5. `1793978154_created_ordenes.js`
6. `1793978155_created_orden_trabajos.js`
7. `1793978156_created_orden_repuestos.js`
8. `1793978157_created_pagos.js`
9. `1793978200_seed_demo.js` — datos de demostración deterministas (IDs fijos).

### `server/scripts/create-collections.mjs`

Helper de un solo uso para crear las colecciones vía API. Se mantuvo como referencia, pero **no es necesario ejecutarlo** porque las migraciones ya crean el esquema. Puede eliminarse sin afectar el funcionamiento.

---

## Vista general de pantallas

- **Panel:** resumen del día, órdenes abiertas, facturación del mes, saldos por cobrar, bajo stock, órdenes recientes, carga de mecánicos, caja de últimos 7 días.
- **Órdenes:** lista con búsqueda, filtros por estado/mecánico/prioridad, saldos pendientes; detalle con flujo de trabajo, mano de obra, repuestos, pagos, cambio de estado y eliminación.
- **Clientes:** directorio con vehículos, historial de órdenes y saldo pendiente; detalle con garaje y servicios.
- **Vehículos:** flota con matrícula, cliente, kilometraje, últimas visitas y estado.
- **Inventario:** repuestos con existencias, precio, valor, alertas de bajo stock y ajuste de existencias.
- **Mecánicos:** equipo del taller, carga de trabajo, órdenes asignadas y facturación por mecánico.
- **Reportes:** facturación por periodo (semana/mes/trimestre/año), ticket promedio, facturación por mecánico, órdenes por estado, métodos de pago, cuentas por cobrar y alertas de inventario. Exportación de pagos a CSV.

---

## Tecnologías

- **Backend:** PocketBase v0.40.6 (REST API + SDK JS)
- **Frontend:** HTML5, CSS3, JavaScript ES Modules (sin framework de compilación)
- **Tipografías:** Inter y Barlow Condensed (autoalojadas en `client/assets/fonts/`)
- **Iconos:** SVG inline

---

## Notas sobre versión controlada

- `server/pocketbase.exe` **no se sube** al repositorio (binario grande). Descárgalo e instálalo manualmente en `server/`.
- `server/pb_data/` **no se sube** (base de datos SQLite generada localmente).
- `server/pb_data/types.d.ts` **no se sube** (generado automáticamente).
- `server/scripts/create-collections.mjs` es un helper opcional; puede mantenerse como referencia.

---

## Publicar en GitHub (sin `gh` CLI)

Como no hay CLI de GitHub ni credenciales configuradas, sigue estos pasos manualmente:

1. Crea un repositorio vacío en GitHub (no inicialices con README).
2. En la carpeta del proyecto, inicializa Git y sube:

```powershell
git init
git add .
git commit -m "feat: El Pistón taller web con PocketBase"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Sustituye `TU_USUARIO` y `TU_REPOSITORIO` por tus datos. Cuando te pida credenciales, usa tu usuario de GitHub y un Personal Access Token (PAT) como contraseña.
