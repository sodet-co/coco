// Motor de documentos: de los abonos propone los Recibos de Caja (RC) y de los cargos los
// Comprobantes de Egreso (CE), cada uno con su tercero, cuenta y nota.

const PREFIJOS_CON_NOMBRE = {
  RC: ['PAGO INTERBANC ', 'PAGO DE PROV ', 'PAGO QR ', 'PAGO LLAVE ', 'TRANSF DE ', 'TRANSFERENCIA DE '],
  CE: ['PAGO PSE ', 'PAGO APP ', 'COMPRA EN '],
};

export const normalizar = (s) =>
  String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

// Nombre del tercero tal como lo escribe el banco ("PAGO INTERBANC CLINICA DE FRAC" -> "CLINICA DE FRAC")
export function nombreEnDescripcion(descripcion, documento = 'RC') {
  const d = normalizar(descripcion);
  const prefijo = PREFIJOS_CON_NOMBRE[documento].find((p) => d.startsWith(p));
  return prefijo ? d.slice(prefijo.length).trim() : null;
}

// terceros: [{ id, nombre, nit, alias: [] }]
export function buscarTercero(descripcion, terceros, documento = 'RC') {
  const nombre = nombreEnDescripcion(descripcion, documento);
  if (!nombre || nombre.length < 4) return { nombreBanco: nombre, tercero: null, candidatos: [] };
  const coincide = (a, b) => a.startsWith(b) || b.startsWith(a);
  const candidatos = terceros.filter((t) => [t.nombre, ...(t.alias || [])].some((n) => coincide(normalizar(n), nombre)));
  return { nombreBanco: nombre, tercero: candidatos.length === 1 ? candidatos[0] : null, candidatos };
}

// Las reglas de abonos (RC) y las de cargos (CE) no se mezclan: el banco usa la misma descripción para ambos
function reglaQueAplica(descripcion, reglas, documento) {
  const d = normalizar(descripcion);
  return reglas.filter((r) => (r.documento || 'RC') === documento)
    .sort((a, b) => a.prioridad - b.prioridad).find((r) => d.startsWith(normalizar(r.patron))) || null;
}

const esRetiro = (descripcion) => normalizar(descripcion).startsWith('RETIRO ');

// Cuenta y nota de la contrapartida cuando no las fija una regla (también al elegir un NIT a mano en pantalla)
export function contrapartidaPara(nit, empresa, documento = 'RC') {
  if (documento === 'CE') return { cuenta: empresa.cta_proveedores, nota: empresa.nota_proveedores };
  const generico = String(nit) === String(empresa.nit_generico);
  return {
    cuenta: generico ? empresa.cta_por_identificar : empresa.cta_clientes,
    nota: generico ? empresa.nota_por_identificar : empresa.nota_identificado,
  };
}

// Regla o coincidencia de terceros; lo que no se reconoce queda con el NIT genérico
function proponer(mov, base, documento, { empresa, terceros, reglas }) {
  const regla = reglaQueAplica(mov.descripcion, reglas, documento);
  if (regla?.accion === 'excluir') return { ...base, incluir: false, origen: 'regla', motivo: `Regla: ${regla.patron}` };
  if (regla?.accion === 'asignar') {
    const nit = regla.nit || empresa.nit_generico;
    const porDefecto = documento === 'RC'
      ? { cuenta: empresa.cta_clientes, nota: empresa.nota_identificado }
      : contrapartidaPara(nit, empresa, documento);
    return {
      ...base, incluir: true, origen: 'regla', motivo: `Regla: ${regla.patron}`,
      nit, cuenta: regla.cta_contable || porDefecto.cuenta, nota: regla.nota || porDefecto.nota, nombreBanco: null,
    };
  }

  // Los retiros en efectivo entran a caja a nombre del tercero interno
  if (documento === 'CE' && esRetiro(mov.descripcion)) {
    return {
      ...base, incluir: true, origen: 'retiro', motivo: 'Retiro de efectivo: entra a caja',
      nit: empresa.tercero_interno, cuenta: empresa.cta_caja, nota: empresa.nota_retiro, nombreBanco: null,
    };
  }

  const { nombreBanco, tercero, candidatos } = buscarTercero(mov.descripcion, terceros, documento);
  if (tercero) {
    return {
      ...base, incluir: true, origen: 'automatico', motivo: `Coincide con ${tercero.nombre}`,
      nit: tercero.nit, ...contrapartidaPara(tercero.nit, empresa, documento), nombreBanco,
    };
  }
  return {
    ...base, incluir: true,
    origen: candidatos.length > 1 ? 'ambiguo' : 'por_identificar',
    motivo: candidatos.length > 1 ? `Varios posibles: ${candidatos.map((c) => c.nombre).join(', ')}` : nombreBanco ? `"${nombreBanco}" no está en terceros` : 'El extracto no trae nombre',
    nit: empresa.nit_generico, ...contrapartidaPara(empresa.nit_generico, empresa, documento), nombreBanco,
  };
}

const baseDe = (mov) => ({ renglon: mov.renglon, fecha: mov.fecha, descripcion: mov.descripcion, sucursal: mov.sucursal, valor: Math.abs(mov.valor) });

// Una propuesta por cada abono (incluye los excluidos por regla, para mostrarlos en pantalla)
export function proponerRecibos(movimientos, contexto) {
  return movimientos.filter((m) => m.valor > 0).map((m) => proponer(m, baseDe(m), 'RC', contexto));
}

// Una propuesta por cada cargo; el valor va en positivo
export function proponerEgresos(movimientos, contexto) {
  return movimientos.filter((m) => m.valor < 0).map((m) => proponer(m, baseDe(m), 'CE', contexto));
}
