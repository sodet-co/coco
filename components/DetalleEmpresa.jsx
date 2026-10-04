'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import FormEmpresa from './FormEmpresa.jsx';
import Cuentas from './Cuentas.jsx';
import Terceros from './Terceros.jsx';
import Reglas from './Reglas.jsx';
import { api } from '@/lib/cliente.js';

export default function DetalleEmpresa({ id }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const recargar = useCallback(() => api(`/api/empresas/${id}`).then(setD).catch((e) => setError(e.message)), [id]);
  useEffect(() => { recargar(); }, [recargar]);

  if (error) return <p className="mensaje error">{error}</p>;
  if (!d) return <p className="cargando">Cargando…</p>;

  const faltantes = [
    !d.cuentas.length && 'registrar al menos una cuenta bancaria',
    !d.terceros.length && 'cargar sus terceros',
  ].filter(Boolean);

  return (
    <>
      <header className="cabecera">
        <Link href="/empresas" className="volver">Empresas</Link>
        <h1>{d.empresa.nombre}</h1>
        {faltantes.length
          ? <p className="pendiente-txt">Para leer extractos de esta empresa falta {faltantes.join(' y ')}.</p>
          : <p>Lista para leer extractos. NIT {d.empresa.nit}, prefijo {d.empresa.prefijo_rc}, próximo recibo {d.empresa.ultimo_consecutivo_rc + 1}.</p>}
      </header>

      <section className="bloque">
        <h2>Datos contables</h2>
        <FormEmpresa key={d.empresa.id + d.empresa.ultimo_consecutivo_rc} inicial={d.empresa} conEstado textoBoton="Guardar cambios"
          alGuardar={async (datos) => { await api(`/api/empresas/${id}`, { metodo: 'PUT', cuerpo: datos }); await recargar(); }} />
      </section>

      <Cuentas empresaId={id} cuentas={d.cuentas} recargar={recargar} />
      <Terceros empresaId={id} terceros={d.terceros} recargar={recargar} />
      <Reglas empresaId={id} reglas={d.reglas} recargar={recargar} />
    </>
  );
}
