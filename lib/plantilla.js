// Arma el Excel de carga para WorldOffice, sin fórmulas: Recibos de Caja (RC, 47 columnas)
// o Comprobantes de Egreso (CE, las mismas columnas menos las dos de recaudo).
import ExcelJS from 'exceljs';
import { nombresDeHojas } from './hojas.js';

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

const SOLO_RC = ['Encab: Recaudado por', 'Encab: Fecha Recaudo'];
export const ENCABEZADOS_POR_DOCUMENTO = {
  RC: ENCABEZADOS,
  CE: ENCABEZADOS.filter((e) => !SOLO_RC.includes(e)),
};

export const prefijoDe = (empresa, documento) => (documento === 'CE' ? empresa.prefijo_ce : empresa.prefijo_rc);

const aNumeroNit = (v) => (/^\d+$/.test(String(v)) ? Number(v) : v);

function renglon({ empresa, documento, numero, recibo, cuenta, debito, credito }) {
  const nit = aNumeroNit(recibo.nit);
  const interno = aNumeroNit(empresa.tercero_interno);
  const celdas = {
    'Encab: Empresa': empresa.nombre,
    'Encab: Tipo Documento': documento,
    'Encab: Prefijo': prefijoDe(empresa, documento),
    'Encab: Documento Número': numero,
    'Encab: Fecha': recibo.fecha, // texto d/mm/aaaa
    'Encab: Tercero Interno': interno,
    'Encab: Tercero Externo': nit,
    'Encab: Nota': recibo.nota,
    'Encab: Verificado': -1,
    'Encab: Anulado': 0,
    'Encab: Recaudado por': interno,
    'Encab: Fecha Recaudo': recibo.fecha,
    'Detalle Con: IdCuentaContable': aNumeroNit(cuenta),
    'Detalle Con: Nota': recibo.nota,
    'Detalle Con: Tercero_Externo': nit,
    'Detalle Con: Débito': debito,
    'Detalle Con: Crédito': credito,
    'Detalle Con: Vencimiento': recibo.fecha,
    'Detalle Con: Excluir NIIF': 0,
    'Detalle Con: No Deducible': 0,
  };
  return ENCABEZADOS_POR_DOCUMENTO[documento].map((e) => celdas[e] ?? null);
}

// Una hoja por extracto; el consecutivo sigue corrido de una hoja a la siguiente.
// extractos: [{ cuentaBanco, anio, mes, recibos: [{ fecha, nit, nota, cuenta, valor }] }] ya en orden
export async function armarPlantilla({ empresa, documento = 'RC', extractos, consecutivoInicial }) {
  const libro = new ExcelJS.Workbook();
  const hojas = nombresDeHojas(extractos.map((e) => ({ anio: e.anio, mes: e.mes, numeroCuenta: e.cuentaBanco.numero })), documento);
  let siguiente = consecutivoInicial;

  extractos.forEach(({ cuentaBanco, recibos }, i) => {
    const hoja = libro.addWorksheet(hojas[i]);
    hoja.addRow(ENCABEZADOS_POR_DOCUMENTO[documento]);
    hoja.getRow(1).font = { bold: true };

    const numerados = recibos.map((r, j) => ({ ...r, numero: siguiente + j }));
    siguiente += recibos.length;
    const alBanco = (r, lado) => renglon({ empresa, documento, numero: r.numero, recibo: r, cuenta: cuentaBanco.cta_contable, debito: 0, credito: 0, [lado]: r.valor });
    const aContrapartida = (r, lado) => renglon({ empresa, documento, numero: r.numero, recibo: r, cuenta: r.cuenta, debito: 0, credito: 0, [lado]: r.valor });
    // Primero todos los débitos y luego todos los créditos (mismo orden y número).
    // RC: débito al banco, crédito a la contrapartida. CE: débito a la contrapartida, crédito al banco.
    if (documento === 'CE') {
      for (const r of numerados) hoja.addRow(aContrapartida(r, 'debito'));
      for (const r of numerados) hoja.addRow(alBanco(r, 'credito'));
    } else {
      for (const r of numerados) hoja.addRow(alBanco(r, 'debito'));
      for (const r of numerados) hoja.addRow(aContrapartida(r, 'credito'));
    }

    hoja.columns.forEach((c, k) => { c.width = k === 0 ? 42 : 16; });
  });

  return { buffer: await libro.xlsx.writeBuffer(), hojas, ultimoConsecutivo: siguiente - 1 };
}
