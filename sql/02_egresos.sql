-- Comprobantes de egreso (CE): datos contables por empresa y reglas separadas por documento.
-- Se puede ejecutar más de una vez.

alter table empresas
  add column if not exists prefijo_ce text,
  add column if not exists ultimo_consecutivo_ce integer not null default 0,
  add column if not exists cta_proveedores text not null default '22050101',
  add column if not exists cta_caja text not null default '11050501',
  add column if not exists nota_proveedores text not null default 'Proveedores-Pagos',
  add column if not exists nota_retiro text not null default 'Retiro de efectivo';

-- Las empresas que ya existían arrancan con el mismo prefijo de los recibos de caja
update empresas set prefijo_ce = prefijo_rc where prefijo_ce is null;
alter table empresas alter column prefijo_ce set not null;

-- Cada regla aplica a los abonos (RC) o a los cargos (CE); las que ya existían son de abonos
alter table reglas_movimiento
  add column if not exists documento text not null default 'RC' check (documento in ('RC', 'CE'));
