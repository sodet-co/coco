// Lector de extractos de cuenta de ahorros/corriente de Bancolombia (PDF).
// Reconstruye cada renglón agrupando los textos del PDF por su altura (y) y
// valida que la cadena de saldos cuadre contra el resumen del banco.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const NUM = String.raw`-?[\d,]*\.\d{2}`;
const RENGLON = new RegExp(String.raw`^(\d{1,2})/(\d{2})\s+(.+?)\s{2,}(?:(.+?)\s{2,})?(${NUM})\s+(${NUM})$`);
const aNumero = (s) => Number(s.replace(/,/g, ''));
const redondear = (n) => Math.round(n * 100) / 100;

export class ErrorExtracto extends Error {
  constructor(codigo, mensaje) { super(mensaje); this.codigo = codigo; }
}

async function lineasDelPdf(datos, clave) {
  let doc;
  try {
    doc = await getDocument({ data: new Uint8Array(datos), password: clave || undefined, verbosity: 0, isEvalSupported: false }).promise;
  } catch (e) {
    if (e?.name === 'PasswordException') {
      throw new ErrorExtracto('CLAVE', clave ? 'La clave (NIT de la empresa) no abre este PDF.' : 'El PDF tiene clave y no se envió ninguna.');
    }
    throw new ErrorExtracto('PDF', 'No se pudo leer el archivo como PDF.');
  }
  const lineas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n);
    const { items } = await pagina.getTextContent();
    const filas = new Map();
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      const fila = filas.get(y) || [];
      fila.push({ x: it.transform[4], fin: it.transform[4] + it.width, txt: it.str });
      filas.set(y, fila);
    }
    const ys = [...filas.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const fila = filas.get(y).sort((a, b) => a.x - b.x);
      let linea = '';
      let finAnterior = null;
      for (const p of fila) {
        if (finAnterior !== null) {
          const hueco = p.x - finAnterior;
          linea += hueco > 8 ? '   ' : hueco > 1 ? ' ' : '';
        }
        linea += p.txt;
        finAnterior = p.fin;
      }
      lineas.push(linea.trim());
    }
  }
  return lineas;
}

export async function leerExtractoBancolombia(datos, clave) {
  const lineas = await lineasDelPdf(datos, clave);
  const texto = lineas.join('\n');

  const periodo = texto.match(/DESDE:\s*(\d{4})\/(\d{2})\/(\d{2})[\s\S]*?HASTA:\s*(\d{4})\/(\d{2})\/(\d{2})/);
  const cuenta = texto.match(/N[ÚU]MERO\s+(\d{6,})/);
  if (!periodo || !cuenta) throw new ErrorExtracto('FORMATO', 'El PDF no parece un extracto de Bancolombia (no se encontró periodo o número de cuenta).');

  const resumen = {};
  for (const [clave_, etiqueta] of [['saldoAnterior', 'SALDO ANTERIOR'], ['totalAbonos', 'TOTAL ABONOS'], ['totalCargos', 'TOTAL CARGOS'], ['saldoActual', 'SALDO ACTUAL']]) {
    const m = texto.match(new RegExp(`${etiqueta}\\s+\\$\\s+(${NUM})`));
    if (!m) throw new ErrorExtracto('FORMATO', `No se encontró "${etiqueta}" en el resumen del extracto.`);
    resumen[clave_] = aNumero(m[1]);
  }

  const anio = Number(periodo[4]);
  const mes = Number(periodo[5]);
  const movimientos = [];
  for (const linea of lineas) {
    const m = linea.match(RENGLON);
    if (!m) continue;
    const [, dia, mesMov, descripcion, sucursal, valor, saldo] = m;
    // Si el extracto cruza de año (DESDE 2025/12/31), un movimiento de diciembre pertenece al año anterior
    const anioMov = Number(mesMov) > mes ? anio - 1 : anio;
    movimientos.push({
      renglon: movimientos.length + 1,
      fecha: `${Number(dia)}/${mesMov}/${anioMov}`,
      descripcion: descripcion.trim(),
      sucursal: (sucursal || '').trim(),
      valor: aNumero(valor),
      saldo: aNumero(saldo),
    });
  }

  // Validaciones: cadena de saldos y totales contra el resumen
  const errores = [];
  let saldo = resumen.saldoAnterior;
  for (const mov of movimientos) {
    saldo = redondear(saldo + mov.valor);
    if (Math.abs(saldo - mov.saldo) > 0.01) errores.push(`Renglón ${mov.renglon} (${mov.fecha} ${mov.descripcion}): saldo esperado ${saldo}, extracto ${mov.saldo}`);
  }
  const abonos = redondear(movimientos.filter((m) => m.valor > 0).reduce((s, m) => s + m.valor, 0));
  const cargos = redondear(-movimientos.filter((m) => m.valor < 0).reduce((s, m) => s + m.valor, 0));
  if (Math.abs(abonos - resumen.totalAbonos) > 0.01) errores.push(`Total abonos leído ${abonos} ≠ resumen ${resumen.totalAbonos}`);
  if (Math.abs(cargos - resumen.totalCargos) > 0.01) errores.push(`Total cargos leído ${cargos} ≠ resumen ${resumen.totalCargos}`);

  return {
    banco: 'BANCOLOMBIA',
    numeroCuenta: cuenta[1],
    desde: `${periodo[1]}-${periodo[2]}-${periodo[3]}`,
    hasta: `${periodo[4]}-${periodo[5]}-${periodo[6]}`,
    anio, mes, resumen, movimientos, errores,
  };
}
