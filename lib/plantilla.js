// Arma el Excel de carga de Recibos de Caja para WorldOffice (47 columnas, sin fórmulas).
import ExcelJS from 'exceljs';

export const ENCABEZADOS = [
  'Encab: Empresa', 'Encab: Tipo Documento', 'Encab: Prefijo', 'Encab: Documento Número', 'Encab: Fecha',
  'Encab: Tercero Interno', 'Encab: Tercero Externo', 'Encab: Nota', 'Encab: Verificado', 'Encab: Anulado',
  'Encab: Sucursal', 'Encab: Clasificación', 'Encab: Recaudado por', 'Encab: Fecha Recaudo',
  ...Array.from({ length: 15 }, (_, i) => `Encab: Personalizado ${i + 1}`),
  'Detalle Con: IdCuentaContable', 'Detalle Con: Nota', 'Detalle Con: Tercero_Externo', 'Detalle Con: Cheque',
  'Detalle Con: Débito', 'Detalle Con: Crédito', 'Detalle Con: Vencimiento', 'Detalle Con: Centro costos',
  'Detalle Con: Activo Fijo', 'Detalle Con: Tipo_Base', 'Detalle Con: Porcentaje_Retención',
  'Detalle Con: BaseRetención', 'Detalle Con: PagoRetención', 'Detalle Con: Sucursal', 'Detalle Con: Excluir NIIF',
  'Detalle Con: No Deducible', 'Detalle Con: Código Centro Costos', 'Detalle Con: Abona_Cruce',
];

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const nombreHoja = (anio, mes) => `RC_${MESES[mes - 1]}${anio}`;

const aNumeroNit = (v) => (/^\d+$/.test(String(v)) ? Number(v) : v);

function renglon({ empresa, numero, recibo, cuenta, debito, credito }) {
  const fila = new Array(ENCABEZADOS.length).fill(null);
  const nit = aNumeroNit(recibo.nit);
  fila[0] = empresa.nombre;                       // A
  fila[1] = 'RC';                                 // B
  fila[2] = empresa.prefijo_rc;                   // C
  fila[3] = numero;                               // D
  fila[4] = recibo.fecha;                         // E (texto d/mm/aaaa)
  fila[5] = aNumeroNit(empresa.tercero_interno);  // F
  fila[6] = nit;                                  // G
  fila[7] = recibo.nota;                          // H
  fila[8] = -1;                                   // I Verificado
  fila[9] = 0;                                    // J Anulado
  fila[12] = aNumeroNit(empresa.tercero_interno); // M Recaudado por
  fila[13] = recibo.fecha;                        // N Fecha Recaudo
  fila[29] = aNumeroNit(cuenta);                  // AD
  fila[30] = recibo.nota;                         // AE
  fila[31] = nit;                                 // AF
  fila[33] = debito;                              // AH
  fila[34] = credito;                             // AI
  fila[35] = recibo.fecha;                        // AJ Vencimiento
  fila[43] = 0;                                   // AR Excluir NIIF
  fila[44] = 0;                                   // AS No Deducible
  return fila;
}

// recibos: [{ fecha, nit, nota, cuenta, valor }] ya en orden
export async function armarPlantilla({ empresa, cuentaBanco, recibos, consecutivoInicial, anio, mes }) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet(nombreHoja(anio, mes));
  hoja.addRow(ENCABEZADOS);
  hoja.getRow(1).font = { bold: true };

  const numerados = recibos.map((r, i) => ({ ...r, numero: consecutivoInicial + i }));
  // Primero todos los débitos al banco, luego todos los créditos a la contrapartida (mismo orden y número)
  for (const r of numerados) hoja.addRow(renglon({ empresa, numero: r.numero, recibo: r, cuenta: cuentaBanco.cta_contable, debito: r.valor, credito: 0 }));
  for (const r of numerados) hoja.addRow(renglon({ empresa, numero: r.numero, recibo: r, cuenta: r.cuenta, debito: 0, credito: r.valor }));

  hoja.columns.forEach((c, i) => { c.width = i === 0 ? 42 : 16; });
  return {
    buffer: await libro.xlsx.writeBuffer(),
    hoja: hoja.name,
    ultimoConsecutivo: consecutivoInicial + recibos.length - 1,
  };
}
