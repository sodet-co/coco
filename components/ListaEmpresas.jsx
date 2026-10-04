'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FormEmpresa from './FormEmpresa.jsx';
import { api } from '@/lib/cliente.js';

export default function ListaEmpresas() {
  const [empresas, setEmpresas] = useState(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const router = useRouter();

  useEffect(() => { api('/api/empresas?todas=1').then(setEmpresas).catch((e) => setError(e.message)); }, []);

  async function crear(datos) {
    const e = await api('/api/empresas', { metodo: 'POST', cuerpo: datos });
    router.push(`/empresas/${e.id}`);
  }

  return (
    <>
      {error && <p className="mensaje error">{error}</p>}
      <div className="barra">
        <button type="button" onClick={() => setCreando(!creando)} className={creando ? 'secundario' : ''}>
          {creando ? 'Cancelar' : 'Nueva empresa'}
        </button>
      </div>
      {creando && (
        <section className="bloque">
          <h2>Nueva empresa</h2>
          <FormEmpresa alGuardar={crear} textoBoton="Crear empresa" />
        </section>
      )}
      {empresas && (
        <div className="tabla-envoltura">
          <table>
            <thead><tr><th>Empresa</th><th>NIT</th><th>Prefijo</th><th className="num">Último RC</th><th className="num">Cuentas</th><th className="num">Terceros</th><th>Estado</th></tr></thead>
            <tbody>
              {empresas.length === 0 && <tr><td colSpan={7} className="vacio">Aún no hay empresas. Crea la primera con el botón de arriba.</td></tr>}
              {empresas.map((e) => (
                <tr key={e.id}>
                  <td><Link href={`/empresas/${e.id}`}>{e.nombre}</Link></td>
                  <td className="fecha">{e.nit}</td>
                  <td>{e.prefijo_rc}</td>
                  <td className="num">{e.ultimo_consecutivo_rc}</td>
                  <td className={`num ${e.num_cuentas ? '' : 'falta'}`}>{e.num_cuentas}</td>
                  <td className={`num ${e.num_terceros ? '' : 'falta'}`}>{e.num_terceros}</td>
                  <td>{e.activa ? 'Activa' : 'Inactiva'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
