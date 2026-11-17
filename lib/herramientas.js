// Cada herramienta vive en /herramientas/<ruta>; para agregar una, se suma aquí y aparece en el inicio y en /herramientas
export const HERRAMIENTAS = [
  {
    ruta: '/herramientas/entidades',
    nombre: 'Empresas y personas',
    descripcion: 'Las de la app móvil: quién tiene acceso a cada una y sus categorías con cuenta contable y naturaleza.',
  },
  {
    ruta: '/herramientas/recibos-egresos',
    nombre: 'Recibos y egresos',
    descripcion: 'Lee los extractos de Bancolombia y genera los Excel de recibos de caja y comprobantes de egreso para WorldOffice.',
  },
  {
    ruta: '/herramientas/empresas',
    nombre: 'Empresas para WorldOffice',
    descripcion: 'Datos contables, cuentas bancarias, terceros y reglas de cada empresa.',
  },
];
