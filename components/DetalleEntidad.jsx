'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/cliente.js';
import ArbolCategorias from './ArbolCategorias.jsx';

export default function DetalleEntidad({ id }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(() => api(`/api/entidades/${id}`).then(setD).catch((e) => setError(e.message)), [id]);
  useEffect(() => { cargar(); }, [cargar]);

  // Ejecuta un cambio, muestra el error si lo hay y recarga
  async function hacer(fn, mensajeOk) {
    setError('');
    setAviso('');
    try {
      await fn();
      if (mensajeOk) setAviso(mensajeOk);
      await cargar();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  if (!d) return error ? <p className="mensaje error">{error}</p> : <p className="cargando">Cargando…</p>;
  const { entidad, usuarios, categorias } = d;

  async function guardarDatos(ev) {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.currentTarget));
    await hacer(() => api(`/api/entidades/${id}`, { metodo: 'PATCH', cuerpo: { ...f, activa: f.activa === 'on' } }), 'Datos guardados.');
  }

  async function agregarUsuario(ev) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const ok = await hacer(() => api(`/api/entidades/${id}/usuarios`, { metodo: 'POST', cuerpo: { email: new FormData(form).get('email') } }), 'Acceso concedido.');
    if (ok) form.reset();
  }

  return (
    <>
      <header className="cabecera">
        <Link href="/herramientas/entidades" className="volver">Empresas y personas</Link>
        <h1>{entidad.nombre}</h1>
        <p>{entidad.tipo === 'empresa' ? 'Empresa' : 'Persona'}{entidad.documento ? ` · ${entidad.documento}` : ''}{entidad.activa ? '' : ' · Inactiva'}</p>
      </header>
      {error && <p className="mensaje error">{error}</p>}
      {aviso && <p className="mensaje ok">{aviso}</p>}

      <section className="bloque">
        <h2>Datos</h2>
        <form className="fila-form" onSubmit={guardarDatos}>
          <label><span>Tipo</span>
            <select name="tipo" defaultValue={entidad.tipo}>
              <option value="empresa">Empresa</option>
              <option value="persona">Persona</option>
            </select>
          </label>
          <label><span>Nombre</span><input name="nombre" defaultValue={entidad.nombre} required /></label>
          <label><span>NIT o cédula</span><input name="documento" defaultValue={entidad.documento ?? ''} inputMode="numeric" /></label>
          <label className="casilla"><input type="checkbox" name="activa" defaultChecked={entidad.activa} /> Activa</label>
          <button type="submit">Guardar</button>
        </form>
      </section>

      <section className="bloque">
        <h2>Quién tiene acceso <span className="contador">{usuarios.length}</span></h2>
        <p className="ayuda">Cada usuario ve en la app móvil y en el inicio de coco solo las empresas o personas que tiene asignadas. El usuario se crea primero en InsForge (Authentication → Users).</p>
        {usuarios.length > 0 && (
          <div className="tabla-envoltura">
            <table className="tarjetas">
              <thead><tr><th>Correo</th><th>Desde</th><th></th></tr></thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td className="desc">{u.email}</td>
                    <td data-label="Desde" className="fecha">{new Date(u.creado_en).toLocaleDateString('es-CO')}</td>
                    <td data-label="">
                      <button type="button" className="enlace peligro"
                        onClick={() => confirm(`¿Quitarle a ${u.email} el acceso a ${entidad.nombre}?`) && hacer(() => api(`/api/entidades/${id}/usuarios?usuario=${u.id}`, { metodo: 'DELETE' }), 'Acceso retirado.')}>
                        Quitar acceso
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form className="fila-form" onSubmit={agregarUsuario}>
          <label><span>Correo del usuario</span><input type="email" name="email" required /></label>
          <button type="submit">Dar acceso</button>
        </form>
      </section>

      <section className="bloque">
        <h2>Categorías</h2>
        <p className="ayuda">Las que se usan en la app móvil para clasificar cada movimiento. La cuenta contable y la naturaleza se heredan de la categoría de arriba si se dejan vacías; en el registro se pueden cambiar.</p>
        <ArbolCategorias entidadId={id} categorias={categorias} hacer={hacer} />
      </section>
    </>
  );
}
