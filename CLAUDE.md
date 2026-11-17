# coco

Aplicación web interna de contabilidad (Colombia). Toma el extracto PDF de Bancolombia de una empresa,
propone a qué tercero corresponde cada movimiento y genera, por separado, el Excel de carga de **Recibos de Caja (RC)**
(abonos) y el de **Comprobantes de Egreso (CE)** (cargos) para el software contable **WorldOffice**. Toda la interfaz, los nombres del código y los mensajes están en español.

Repositorio: https://github.com/sodet-co/coco (rama `main`).

## Stack y comandos

- Next.js 15 (App Router) + React 19, JavaScript puro (sin TypeScript), ESM (`"type": "module"`).
- Postgres en **InsForge** (proyecto `coco`, conexión directa como `postgres`) con `pg` (SQL directo, sin ORM), `pdfjs-dist` para leer el PDF, `exceljs` para leer y escribir Excel.
- Alias de importación `@/` = raíz del proyecto. CSS en un solo archivo: `app/globals.css`.
- `npm run dev` (http://localhost:3000), `npm run build`, `npm start`. No hay pruebas ni linter configurados.
- `DATABASE_URL` va en `.env.local` (ignorado por git; `.env.example` es la plantilla); se obtiene con
  `npx @insforge/cli db connection-string`. `.mcp.json` (MCP de InsForge, con la API key) también está ignorado.
- Producción: Vercel (https://coco-phi-five.vercel.app), con `DATABASE_URL`, `NEXT_PUBLIC_INSFORGE_URL` y
  `NEXT_PUBLIC_INSFORGE_ANON_KEY` en sus variables de entorno.

## Inicio de sesión

- Usuarios de InsForge Auth (correo y clave). El registro público está cerrado: los usuarios se crean en el panel
  de InsForge (Authentication → Users). Todo usuario que entra ve todo; no hay roles.
- `middleware.js` protege todo menos `/login` y los estáticos: renueva la sesión con `updateSession`
  (`@insforge/sdk/ssr/middleware`) y verifica la firma RS256 del token contra `/.well-known/jwks.json` del proyecto
  con `jose`, exigiendo `role = authenticated`. Sin sesión, las páginas van a `/login?siguiente=…` y la API responde 401;
  `api()` de `lib/cliente.js` manda a `/login` ante un 401.
- Entrar y salir son Server Actions en `app/login/acciones.js` (`createAuthActions`), para que el token de refresco
  quede en cookie httpOnly. `siguiente` solo acepta rutas internas.
- coco sigue consultando la base como `postgres` (`lib/db.js`); la sesión solo decide quién entra.
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
2. **Proponer documentos** — `lib/motor.js`: `proponerRecibos` toma los abonos (`valor > 0`) para el RC y
   `proponerEgresos` los cargos (`valor < 0`, con el valor en positivo) para el CE. La ruta devuelve
   `propuestas: { RC, CE }` y `consecutivoSugerido: { RC, CE }`. Para cada movimiento:
   - Regla (`reglas_movimiento`, coincide si la descripción *empieza por* el patrón, menor `prioridad` gana;
     solo se miran las reglas de ese `documento`): `excluir` lo saca; `asignar` fija NIT, cuenta o nota.
   - Solo CE: si la descripción empieza por `RETIRO ` es un retiro en efectivo → débito a `cta_caja` a nombre del
     `tercero_interno`, con `nota_retiro`.
   - Si no hay regla, extrae el nombre tras prefijos como `PAGO INTERBANC`, `TRANSF DE`, `PAGO QR` (RC) o
     `PAGO PSE`, `PAGO APP`, `COMPRA EN` (CE) y lo compara por prefijo contra el nombre y los alias de los terceros.
   - Una sola coincidencia → `automatico` (cuenta de clientes). Varias → `ambiguo`. Ninguna → `por_identificar`
     (NIT genérico, cuenta y nota de "por identificar"). En el CE la contrapartida siempre es `cta_proveedores`
     con `nota_proveedores`, y lo normal es que la mayoría quede con el NIT genérico.
3. **Revisar** — `components/Generador.jsx`: un selector cambia entre recibos de caja y comprobantes de egreso
   (cada extracto guarda `filas: { RC, CE }` y hay un consecutivo por documento); una sección por extracto, ordenadas por periodo y número de cuenta.
   La persona incluye o excluye abonos, cambia tercero, cuenta y nota, crea terceros sobre la marcha, quita
   extractos y ajusta el consecutivo inicial.
4. **Descargar** — `POST /api/plantilla` (`{ empresaId, documento, consecutivoInicial, extractos: [{ cuentaId, anio, mes, recibos }] }`),
   una llamada y un archivo por documento → `lib/plantilla.js` arma un `.xlsx` con **una hoja por extracto** y el consecutivo corrido de una hoja a la
   siguiente. Un extracto sin recibos incluidos no genera hoja. Cada hoja va sin fórmulas, **primero todos
   los débitos y luego todos los créditos**, con el mismo número de documento en ambos renglones. RC: 47 columnas,
   débito al banco y crédito a la contrapartida. CE: débito a la contrapartida y crédito al banco, con las mismas
   columnas menos `Recaudado por` y `Fecha Recaudo` (45; supuesto pendiente de confirmar contra la plantilla de
   egresos de WorldOffice, se ajusta en `ENCABEZADOS_POR_DOCUMENTO`).
   Los nombres salen de `lib/hojas.js`: `RC_<Mes><Año>` o `CE_<Mes><Año>`, y si hay dos cuentas del mismo mes se agregan los últimos
   4 dígitos de la cuenta (`RC_Marzo2026_4471`). En la misma transacción:
   - `empresas.ultimo_consecutivo_rc` (o `ultimo_consecutivo_ce`) `= greatest(actual, último usado)`, para que regenerar el mismo mes no lo dispare.
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

La base es la misma que usará la app móvil (otro repositorio). El esquema base está en `sql/01_esquema_empresas.sql`
(ya incluye `02_egresos.sql`). Las tablas tienen RLS activo y sin políticas: la API pública de InsForge (anon/authenticated)
no las ve; coco entra como `postgres` y no le afecta. Si la app móvil necesita una tabla, se le agregan políticas. Tablas que usa el código:

- `empresas`: nombre, nit, prefijo_rc, tercero_interno, nit_generico, nota_identificado, nota_por_identificar,
  cta_clientes, cta_por_identificar, ultimo_consecutivo_rc, activa; para egresos: prefijo_ce, ultimo_consecutivo_ce,
  cta_proveedores, cta_caja, nota_proveedores, nota_retiro.
- `cuentas_bancarias`: empresa_id, banco, tipo, numero, cta_contable.
- `terceros`: empresa_id, nombre, nit, nit_alt — único por (empresa_id, nit).
- `terceros_alias`: tercero_id, alias.
- `reglas_movimiento`: empresa_id, documento (`RC` | `CE`), patron, accion (`excluir` | `asignar`), nit, cta_contable, nota, prioridad.

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
  Tipografía Outfit (`@fontsource/outfit`), geométrica como el logo; las cifras solo se alinean en columna donde
  el CSS pone `font-variant-numeric: tabular-nums`. Formas redondas: botones y chips en píldora, tarjetas con `--radio`. El ámbar queda solo para "por identificar"
  y el rojo para errores.
- Responsive: en `app/globals.css`, bajo 720px las tablas con clase `tarjetas` se muestran como tarjetas y cada
  `<td>` toma su encabezado de `data-label`. Una tabla nueva debe llevar ambas cosas.
- `lib/hojas.js` no tiene dependencias porque también lo importa el navegador; no importar ahí `exceljs` ni `pg`.
- `contrapartida` está duplicada entre `lib/motor.js` (`contrapartidaPara`) y `components/Generador.jsx`:
  si cambia una, cambia la otra.
