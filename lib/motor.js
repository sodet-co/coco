// Motor de Recibos de Caja: decide qué abonos van al RC y propone tercero, cuenta y nota.

const PREFIJOS_CON_NOMBRE = ['PAGO INTERBANC ', 'PAGO DE PROV ', 'PAGO QR ', 'PAGO LLAVE ', 'TRANSF DE ', 'TRANSFERENCIA DE '];

export const normalizar = (s) =>
  String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

// Nombre del pagador tal como lo escribe el banco ("PAGO INTERBANC CLINICA DE FRAC" -> "CLINICA DE FRAC")
export function nombreEnDescripcion(descripcion) {
  const d = normalizar(descripcion);
  const prefijo = PREFIJOS_CON_NOMBRE.find((p) => d.startsWith(p));
  return prefijo ? d.slice(prefijo.length).trim() : null;
}

// terceros: [{ id, nombre, nit, alias: [] }]
export function buscarTercero(descripcion, terceros) {
  const nombre = nombreEnDescripcion(descripcion);
  if (!nombre || nombre.length < 4) return { nombreBanco: nombre, tercero: null, candidatos: [] };
  const coincide = (a, b) => a.startsWith(b) || b.startsWith(a);
  const candidatos = terceros.filter((t) => [t.nombre, ...(t.alias || [])].some((n) => coincide(normalizar(n), nombre)));
  return { nombreBanco: nombre, tercero: candidatos.length === 1 ? candidatos[0] : null, candidatos };
}

function reglaQueAplica(descripcion, reglas) {
  const d = normalizar(descripcion);
  return [...reglas].sort((a, b) => a.prioridad - b.prioridad).find((r) => d.startsWith(normalizar(r.patron))) || null;
}

// Devuelve una propuesta por cada abono que va al RC (o marcado como excluido por regla, para mostrarlo en pantalla)
export function proponerRecibos(movimientos, { empresa, terceros, reglas }) {
  const propuestas = [];
  for (const mov of movimientos) {
    if (mov.valor <= 0) continue; // RC = solo abonos
    const base = { renglon: mov.renglon, fecha: mov.fecha, descripcion: mov.descripcion, sucursal: mov.sucursal, valor: mov.valor };
    const regla = reglaQueAplica(mov.descripcion, reglas);

    if (regla?.accion === 'excluir') {
      propuestas.push({ ...base, incluir: false, origen: 'regla', motivo: `Regla: ${regla.patron}` });
      continue;
    }
    if (regla?.accion === 'asignar') {
      propuestas.push({
        ...base, incluir: true, origen: 'regla', motivo: `Regla: ${regla.patron}`,
        nit: regla.nit || empresa.nit_generico,
        cuenta: regla.cta_contable || empresa.cta_clientes,
        nota: regla.nota || empresa.nota_identificado,
        nombreBanco: null,
      });
      continue;
    }

    const { nombreBanco, tercero, candidatos } = buscarTercero(mov.descripcion, terceros);
    if (tercero) {
      propuestas.push({
        ...base, incluir: true, origen: 'automatico', motivo: `Coincide con ${tercero.nombre}`,
        nit: tercero.nit, cuenta: empresa.cta_clientes, nota: empresa.nota_identificado, nombreBanco,
      });
    } else {
      propuestas.push({
        ...base, incluir: true,
        origen: candidatos.length > 1 ? 'ambiguo' : 'por_identificar',
        motivo: candidatos.length > 1 ? `Varios posibles: ${candidatos.map((c) => c.nombre).join(', ')}` : nombreBanco ? `"${nombreBanco}" no está en terceros` : 'El extracto no trae nombre',
        nit: empresa.nit_generico, cuenta: empresa.cta_por_identificar, nota: empresa.nota_por_identificar, nombreBanco,
      });
    }
  }
  return propuestas;
}

// Cuenta y nota que corresponden a un NIT elegido a mano en pantalla
export function contrapartidaPara(nit, empresa) {
  const generico = String(nit) === String(empresa.nit_generico);
  return {
    cuenta: generico ? empresa.cta_por_identificar : empresa.cta_clientes,
    nota: generico ? empresa.nota_por_identificar : empresa.nota_identificado,
  };
}
