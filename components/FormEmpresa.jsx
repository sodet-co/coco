'use client';
import { useState } from 'react';

export const EMPRESA_VACIA = {
  nombre: '', nit: '', prefijo_rc: '', tercero_interno: '', ultimo_consecutivo_rc: 0,
  cta_clientes: '13050501', cta_por_identificar: '13050520', nit_generico: '999999999',
  nota_identificado: 'Clientes-Pagos', nota_por_identificar: 'Pagos por Identificar', activa: true,
};

const CAMPOS = [
  ['nombre', 'Nombre', 'Tal como va en WorldOffice (columna Empresa)', 'ancho'],
  ['nit', 'NIT', 'Sin dígito de verificación. También es la clave de los PDF', 'num'],
  ['prefijo_rc', 'Prefijo de recibos de caja', 'Ej. SLE'],
  ['tercero_interno', 'Tercero interno', 'Cédula del representante legal', 'num'],
  ['ultimo_consecutivo_rc', 'Último recibo usado', 'El próximo RC arranca en este número + 1', 'num'],
  ['cta_clientes', 'Cuenta de clientes', 'Crédito cuando el pagador está identificado', 'num'],
  ['cta_por_identificar', 'Cuenta por identificar', 'Crédito cuando el pagador es el NIT genérico', 'num'],
  ['nit_generico', 'NIT genérico', 'Tercero para pagos sin identificar', 'num'],
  ['nota_identificado', 'Nota para identificados', 'Columnas Nota del RC'],
  ['nota_por_identificar', 'Nota para no identificados', 'Columnas Nota del RC'],
];

export default function FormEmpresa({ inicial, alGuardar, textoBoton, conEstado }) {
  const [datos, setDatos] = useState({ ...EMPRESA_VACIA, ...inicial });
  const [estado, setEstado] = useState({ guardando: false, error: '', ok: '' });
  const cambiar = (k, v) => setDatos((d) => ({ ...d, [k]: v }));

  async function enviar(ev) {
    ev.preventDefault();
    setEstado({ guardando: true, error: '', ok: '' });
    try {
      await alGuardar({ ...datos, ultimo_consecutivo_rc: Number(datos.ultimo_consecutivo_rc) });
      setEstado({ guardando: false, error: '', ok: 'Cambios guardados.' });
    } catch (e) {
      setEstado({ guardando: false, error: e.message, ok: '' });
    }
  }

  return (
    <form className="form-empresa" onSubmit={enviar}>
      {CAMPOS.map(([k, etiqueta, ayuda, tipo]) => (
        <label key={k} className={tipo === 'ancho' ? 'ancho' : ''}>
          <span>{etiqueta}</span>
          <input value={datos[k] ?? ''} inputMode={tipo === 'num' ? 'numeric' : undefined}
            onChange={(e) => cambiar(k, tipo === 'num' ? e.target.value.replace(/\D/g, '') : e.target.value)} />
          <small>{ayuda}</small>
        </label>
      ))}
      {conEstado && (
        <label className="check">
          <input type="checkbox" checked={datos.activa} onChange={(e) => cambiar('activa', e.target.checked)} />
          Empresa activa (aparece en Recibos de caja)
        </label>
      )}
      <div className="acciones ancho">
        <button type="submit" disabled={estado.guardando}>{estado.guardando ? 'Guardando…' : textoBoton}</button>
        {estado.error && <span className="txt-error">{estado.error}</span>}
        {estado.ok && <span className="txt-ok">{estado.ok}</span>}
      </div>
    </form>
  );
}
