# coco

Aplicación web interna de contabilidad (Colombia). Toma el extracto PDF de Bancolombia de una empresa,
propone a qué tercero corresponde cada abono y genera el Excel de carga de **Recibos de Caja (RC)** para
el software contable **WorldOffice**. Toda la interfaz, los nombres del código y los mensajes están en español.

Repositorio: https://github.com/sodet-co/coco (rama `main`).

## Stack y comandos

- Next.js 15 (App Router) + React 19, JavaScript puro (sin TypeScript), ESM (`"type": "module"`).
- Postgres con `pg` (SQL directo, sin ORM), `pdfjs-dist` para leer el PDF, `exceljs` para leer y escribir Excel.
- Alias de importación `@/` = raíz del proyecto. CSS en un solo archivo: `app/globals.css`.
- `npm run dev` (http://localhost:3000), `npm run build`, `npm start`. No hay pruebas ni linter configurados.
- `DATABASE_URL` va en `.env.local` (ignorado por git; `.env.example` es la plantilla).
- Entorno: Windows, PowerShell.

## Flujo principal

Primero se elige la empresa y luego se suben uno o varios PDF; todos los extractos de una sesión son de esa empresa.

1. **Leer extracto** — `POST /api/extracto` (multipart: `empresaId`, `archivo`), **un PDF por llamada**: la pantalla
   los envía uno tras otro. Un archivo que falla no detiene a los demás, y se rechaza un extracto repetido
   (misma cuenta y periodo).
   `lib/extracto/bancolombia.js` abre el PDF usando el **NIT de la empresa como clave**, reconstruye los
   renglones agrupando el texto por su altura (y) y valida la cadena de saldos y los totales contra el
   resumen del banco. Las diferencias no detienen el proceso: se devuelven en `errores` y se muestran en pantalla.
   La cuenta del extracto debe existir en `cuentas_bancarias` de esa empresa; si no, responde 422.
2. **Proponer recibos** — `lib/motor.js` → `proponerRecibos`. Solo abonos (`valor > 0`). Para cada uno:
   - Regla (`reglas_movimiento`, coincide si la descripción *empieza por* el patrón, menor `prioridad` gana):
     `excluir` lo saca del RC; `asignar` fija NIT, cuenta o nota.
   - Si no hay regla, extrae el nombre del pagador tras prefijos como `PAGO INTERBANC`, `TRANSF DE`, `PAGO QR`
     y lo compara por prefijo contra el nombre y los alias de los terceros.
   - Una sola coincidencia → `automatico` (cuenta de clientes). Varias → `ambiguo`. Ninguna → `por_identificar`
     (NIT genérico, cuenta y nota de "por identificar").
3. **Revisar** — `components/Generador.jsx`: una sección por extracto, ordenadas por periodo y número de cuenta.
   La persona incluye o excluye abonos, cambia tercero, cuenta y nota, crea terceros sobre la marcha, quita
   extractos y ajusta el consecutivo inicial.
4. **Descargar** — `POST /api/plantilla` (`{ empresaId, consecutivoInicial, extractos: [{ cuentaId, anio, mes, recibos }] }`)
   → `lib/plantilla.js` arma un solo `.xlsx` con **una hoja por extracto** y el consecutivo corrido de una hoja a la
   siguiente. Un extracto sin recibos incluidos no genera hoja. Cada hoja: 47 columnas, sin fórmulas, **primero todos
   los débitos al banco y luego todos los créditos a la contrapartida**, con el mismo número de recibo en ambos renglones.
   Los nombres salen de `lib/hojas.js`: `RC_<Mes><Año>`, y si hay dos cuentas del mismo mes se agregan los últimos
   4 dígitos de la cuenta (`RC_Marzo2026_4471`). En la misma transacción:
   - `empresas.ultimo_consecutivo_rc = greatest(actual, último usado)`, para que regenerar el mismo mes no lo dispare.
   - Si un tercero fue asignado a mano a un abono con nombre del banco, ese nombre se guarda como alias.

## Mapa del código

- `lib/db.js`: pool de Postgres compartido en `globalThis`.
- `lib/datos.js`: consultas del flujo de generación (`contextoEmpresa`, `aprenderAlias`).
- `lib/admin.js`: CRUD y validaciones de empresas, cuentas, terceros, alias y reglas; define `ErrorDatos`.
- `lib/api.js`: `manejar(fn)` envuelve cada handler y traduce errores (`ErrorDatos`, códigos de Postgres) a JSON `{ error }`.
- `lib/cliente.js`: `api()` para llamar la API desde el navegador y `limpiarNit()`.
- `app/api/*`: rutas REST (empresas, cuentas, terceros, alias, reglas, extracto, plantilla). Usan `runtime = 'nodejs'`.
- `app/page.js`: generador. `app/empresas`: listado y detalle de empresa (datos contables, cuentas, terceros, reglas).
- `components/ImportarTerceros.jsx`: importación masiva de terceros desde `.xlsx`, adivinando las columnas de nombre y NIT.

## Base de datos

El esquema (`01_esquema_empresas.sql`, mencionado en el README) **no está en el repositorio**. Tablas que usa el código:

- `empresas`: nombre, nit, prefijo_rc, tercero_interno, nit_generico, nota_identificado, nota_por_identificar,
  cta_clientes, cta_por_identificar, ultimo_consecutivo_rc, activa.
- `cuentas_bancarias`: empresa_id, banco, tipo, numero, cta_contable.
- `terceros`: empresa_id, nombre, nit, nit_alt — único por (empresa_id, nit).
- `terceros_alias`: tercero_id, alias.
- `reglas_movimiento`: empresa_id, patron, accion (`excluir` | `asignar`), nit, cta_contable, nota, prioridad.

## Reglas del dominio

- NIT y cuentas contables van solo con dígitos; el NIT sin dígito de verificación.
- `tercero_interno` es la cédula del representante legal. `nit_generico` por defecto es `999999999`.
- Toda empresa nueva nace con la regla que excluye `ABONO INTERESES AHORROS`.
- Las fechas viajan como texto `d/mm/aaaa`. Si el extracto cruza de año, los movimientos de diciembre quedan en el año anterior.
- Solo se soporta Bancolombia; un banco nuevo sería otro lector en `lib/extracto/`.

## Convenciones

- Identificadores, comentarios y textos de interfaz en español, con mensajes de error que le digan a la persona qué hacer.
- Los handlers devuelven objetos planos o `Response` y siempre van envueltos en `manejar`.
- Marca: logo en `public/coco-palabra.svg` (navegación) y favicon en `app/icon.svg`. Los colores salen del logo y
  viven como variables en `app/globals.css`: azul marino `--marca` `#12355b`, grafito `--tinta` `#2b2f33`.
  Formas redondas: botones y chips en píldora, tarjetas con `--radio`. El ámbar queda solo para "por identificar"
  y el rojo para errores.
- Responsive: en `app/globals.css`, bajo 720px las tablas con clase `tarjetas` se muestran como tarjetas y cada
  `<td>` toma su encabezado de `data-label`. Una tabla nueva debe llevar ambas cosas.
- `lib/hojas.js` no tiene dependencias porque también lo importa el navegador; no importar ahí `exceljs` ni `pg`.
- `contrapartida` está duplicada entre `lib/motor.js` (`contrapartidaPara`) y `components/Generador.jsx`:
  si cambia una, cambia la otra.
