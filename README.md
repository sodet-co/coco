# coco · Recibos de caja para WorldOffice

Lee el extracto PDF de Bancolombia (lo abre con el NIT de la empresa), propone el tercero
de cada abono y genera el Excel de carga de Recibos de Caja para WorldOffice.

## Puesta en marcha (Windows / PowerShell)

1. Copia `.env.example` como `.env.local` y ajusta `DATABASE_URL` a tu Postgres local.
2. `npm install`
3. `npm run dev`
4. Abre http://localhost:3000

La base debe tener el esquema de `01_esquema_empresas.sql`.

## Estructura

- `lib/extracto/bancolombia.js`: lector del PDF y validación de saldos contra el resumen del banco
- `lib/motor.js`: reglas, coincidencia de terceros y alias, cuenta y nota por recibo
- `lib/plantilla.js`: arma el Excel de 47 columnas (débitos primero, luego créditos)
- `lib/datos.js`: consultas a Postgres
- `app/api/*`: empresas, extracto, terceros, plantilla
- `components/Generador.jsx`: pantalla de revisión

## Qué guarda en la base al descargar

- `empresas.ultimo_consecutivo_rc` sube al último número usado (si generas otra vez el mismo mes no se dispara).
- Si asignas a mano un tercero a un abono que trae nombre del banco, ese nombre queda como alias para los meses siguientes.
