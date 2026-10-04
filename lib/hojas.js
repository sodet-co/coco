// Nombres de las hojas del Excel. Sin dependencias, para usarlo también en el navegador.
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const nombreHoja = (anio, mes) => `RC_${MESES[mes - 1]}${anio}`;

// Una hoja por extracto. Si dos extractos son del mismo mes (cuentas distintas),
// se distinguen con los últimos 4 dígitos de la cuenta: RC_Marzo2026_4471
// extractos: [{ anio, mes, numeroCuenta }]
export function nombresDeHojas(extractos) {
  const bases = extractos.map((e) => nombreHoja(e.anio, e.mes));
  const usados = new Set();
  return extractos.map((e, i) => {
    const repetido = bases.filter((b) => b === bases[i]).length > 1;
    const propuesto = repetido ? `${bases[i]}_${String(e.numeroCuenta).slice(-4)}` : bases[i];
    let nombre = propuesto;
    for (let n = 2; usados.has(nombre); n++) nombre = `${propuesto}_${n}`;
    usados.add(nombre);
    return nombre;
  });
}
