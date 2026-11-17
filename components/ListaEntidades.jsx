'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/cliente.js';

export default function ListaEntidades() {
  const [entidades, setEntidades] = useState(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const router = useRouter();

  useEffect(() => { api('/api/entidades').then(setEntidades).catch((e) => setError(e.message)); }, []);

  async function crear(ev) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    setError('');
    try {
      const e = await api('/api/entidades', { metodo: 'POST', cuerpo: Object.fromEntries(form) });
      router.push(`/herramientas/entidades/${e.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {error && <p className="mensaje error">{error}</p>}
      <div className="barra">
        <button type="button" onClick={() => setCreando(!creando)} className={creando ? 'secundario' : ''}>
          {creando ? 'Cancelar' : 'Nueva empresa o persona'}
        </button>
      </div>
      {creando && (
        <form className="fila-form" onSubmit={crear}>
          <label><span>Tipo</span>
            <select name="tipo" defaultValue="empresa">
              <option value="empresa">Empresa</option>
              <option value="persona">Persona</option>
            </select>
          </label>
          <label><span>Nombre</span><input name="nombre" required placeholder="Cotta & Consultores" /></label>
          <label><span>NIT o cédula (opcional)</span><input name="documento" inputMode="numeric" /></label>
          <button type="submit">Crear</button>
        </form>
      )}
      {entidades && (
        <div className="tabla-envoltura">
          <table className="tarjetas">
            <thead><tr><th>Nombre</th><th>Tipo</th><th>NIT o cédula</th><th className="num">Usuarios</th><th className="num">Movimientos</th><th>Estado</th></tr></thead>
            <tbody>
              {entidades.length === 0 && <tr><td colSpan={6} className="vacio">Aún no hay empresas ni personas. Crea la primera con el botón de arriba.</td></tr>}
              {entidades.map((e) => (
                <tr key={e.id}>
                  <td className="desc"><Link href={`/herramientas/entidades/${e.id}`}>{e.nombre}</Link></td>
                  <td data-label="Tipo">{e.tipo === 'empresa' ? 'Empresa' : 'Persona'}</td>
                  <td data-label="NIT o cédula" className="fecha">{e.documento}</td>
                  <td data-label="Usuarios" className={`num ${e.num_usuarios ? '' : 'falta'}`}>{e.num_usuarios}</td>
                  <td data-label="Movimientos" className="num">{e.num_movimientos}</td>
                  <td data-label="Estado">{e.activa ? 'Activa' : 'Inactiva'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
