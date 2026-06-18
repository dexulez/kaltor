export const MODULOS = [
  { key: 'dashboard',     label: 'Dashboard',      icon: '📊', href: '/dashboard' },
  { key: 'clientes',      label: 'Clientes',        icon: '👤', href: '/clientes' },
  { key: 'reparaciones',  label: 'Reparaciones',    icon: '🔧', href: '/reparaciones' },
  { key: 'inventario',    label: 'Inventario',      icon: '📦', href: '/inventario' },
  { key: 'caja',          label: 'Caja / Ventas',   icon: '💰', href: '/caja' },
  { key: 'compras',       label: 'Compras',         icon: '🏭', href: '/compras' },
  { key: 'usuarios',      label: 'Usuarios',        icon: '👥', href: '/usuarios' },
  { key: 'informes',      label: 'Informes',        icon: '📈', href: '/informes' },
  { key: 'servicios',     label: 'Servicios',       icon: '🔩', href: '/servicios' },
  { key: 'manuales',      label: 'Manuales',        icon: '🧠', href: '/manuales' },
  { key: 'configuracion', label: 'Configuración',   icon: '⚙️', href: '/configuracion' },
  { key: 'catalogo_b2b',  label: 'Catálogo B2B',    icon: '🛍️', href: '/catalogo-b2b' },
  { key: 'pedidos_b2b',   label: 'Pedidos B2B',     icon: '📥', href: '/pedidos-b2b' },
] as const

export type ModuloKey = typeof MODULOS[number]['key']

// ── Sub-permisos por módulo ────────────────────────────────────────────────────
export const SUB_PERMISOS: Partial<Record<ModuloKey, { key: string; label: string; desc: string }[]>> = {
  clientes: [
    { key: 'clientes.crear', label: 'Crear y editar clientes', desc: 'Registrar nuevos clientes y modificar sus datos' },
  ],
  reparaciones: [
    { key: 'reparaciones.ver_todas',  label: 'Ver todas las OTs',       desc: 'Sin esto, el técnico solo ve sus OTs asignadas y las disponibles' },
    { key: 'reparaciones.adjudicar',  label: 'Adjudicarse OTs',         desc: 'Tomar OTs sin técnico asignado' },
    { key: 'reparaciones.crear',      label: 'Crear nuevas OTs',        desc: 'Registrar órdenes de trabajo nuevas' },
    { key: 'reparaciones.cobrar',     label: 'Cobrar OTs desde taller', desc: 'Acceder al botón "Cobrar en caja" en cada OT' },
  ],
  inventario: [
    { key: 'inventario.editar',       label: 'Crear/editar productos',   desc: 'Agregar y modificar productos del inventario' },
    { key: 'inventario.ajustar_stock',label: 'Ajustar stock',            desc: 'Toma de inventario y ajustes manuales de cantidad' },
  ],
  caja: [
    { key: 'caja.ver_historial',      label: 'Ver historial completo',    desc: 'Ver todas las ventas del período, no solo las propias' },
    { key: 'caja.anular',             label: 'Anular ventas',              desc: 'Marcar ventas como anuladas' },
    { key: 'caja.ver_resumen_sesion', label: 'Ver resumen de sesión',      desc: 'Ver totales, IVA, PPM y desglose por método de pago' },
    { key: 'caja.ver_comisiones',     label: 'Ver mis comisiones del día', desc: 'Mostrar panel de comisiones generadas en la sesión' },
  ],
  compras: [
    { key: 'compras.crear',   label: 'Crear órdenes de compra', desc: 'Registrar nuevas OCs a proveedores' },
    { key: 'compras.recibir', label: 'Recibir mercancía',        desc: 'Confirmar recepción y actualizar stock' },
  ],
  informes: [
    { key: 'informes.solo_propios',      label: 'Solo mis datos',             desc: 'El usuario solo ve su rendimiento personal, no el global' },
    { key: 'informes.ver_ventas',        label: 'Ver pestaña Ventas',         desc: '' },
    { key: 'informes.ver_rentabilidad',  label: 'Ver pestaña Rentabilidad',   desc: '' },
  ],
}

// ── Acceso a módulo por defecto según rol ────────────────────────────────────
export const MODULOS_ROL_DEFAULT: Record<string, ModuloKey[]> = {
  administrador:     ['dashboard', 'clientes', 'reparaciones', 'inventario', 'caja', 'compras', 'usuarios', 'informes', 'servicios', 'manuales', 'configuracion', 'pedidos_b2b'],
  tecnico:           ['dashboard', 'reparaciones', 'inventario', 'servicios', 'manuales', 'informes'],
  vendedor:          ['dashboard', 'clientes', 'reparaciones', 'inventario', 'caja', 'servicios', 'informes', 'pedidos_b2b'],
  supervisor_ventas: ['dashboard', 'clientes', 'reparaciones', 'inventario', 'caja', 'compras', 'servicios', 'manuales', 'informes', 'pedidos_b2b'],
  comprador_externo: ['catalogo_b2b', 'pedidos_b2b'],
}

// ── Sub-permisos por defecto según rol ───────────────────────────────────────
const SUB_DEFAULT: Record<string, Record<string, boolean>> = {
  administrador: {
    'clientes.crear': true,
    'reparaciones.ver_todas': true, 'reparaciones.adjudicar': false, 'reparaciones.crear': true, 'reparaciones.cobrar': true,
    'inventario.editar': true, 'inventario.ajustar_stock': true,
    'caja.ver_historial': true, 'caja.anular': true, 'caja.ver_resumen_sesion': true, 'caja.ver_comisiones': true,
    'compras.crear': true, 'compras.recibir': true,
    'informes.solo_propios': false, 'informes.ver_ventas': true, 'informes.ver_rentabilidad': true,
  },
  tecnico: {
    'clientes.crear': false,
    'reparaciones.ver_todas': false, 'reparaciones.adjudicar': true, 'reparaciones.crear': false, 'reparaciones.cobrar': false,
    'inventario.editar': false, 'inventario.ajustar_stock': false,
    'caja.ver_historial': false, 'caja.anular': false, 'caja.ver_resumen_sesion': false, 'caja.ver_comisiones': true,
    'compras.crear': false, 'compras.recibir': false,
    'informes.solo_propios': true, 'informes.ver_ventas': false, 'informes.ver_rentabilidad': true,
  },
  vendedor: {
    'clientes.crear': true,
    'reparaciones.ver_todas': true, 'reparaciones.adjudicar': false, 'reparaciones.crear': true, 'reparaciones.cobrar': true,
    'inventario.editar': false, 'inventario.ajustar_stock': false,
    'caja.ver_historial': true, 'caja.anular': false, 'caja.ver_resumen_sesion': false, 'caja.ver_comisiones': false,
    'compras.crear': false, 'compras.recibir': false,
    'informes.solo_propios': false, 'informes.ver_ventas': true, 'informes.ver_rentabilidad': false,
  },
  supervisor_ventas: {
    'clientes.crear': true,
    'reparaciones.ver_todas': true, 'reparaciones.adjudicar': false, 'reparaciones.crear': true, 'reparaciones.cobrar': true,
    'inventario.editar': false, 'inventario.ajustar_stock': true,
    'caja.ver_historial': true, 'caja.anular': true, 'caja.ver_resumen_sesion': true, 'caja.ver_comisiones': true,
    'compras.crear': true, 'compras.recibir': true,
    'informes.solo_propios': false, 'informes.ver_ventas': true, 'informes.ver_rentabilidad': true,
  },
}

export function getDefaultPermisos(rolNombre: string): Record<string, boolean> {
  const modDefaults = MODULOS_ROL_DEFAULT[rolNombre] ?? []
  const modPerms = Object.fromEntries(MODULOS.map(m => [m.key, modDefaults.includes(m.key)]))
  return { ...modPerms, ...(SUB_DEFAULT[rolNombre] ?? {}) }
}

export function tieneAccesoModulo(
  modulo: ModuloKey,
  rolNombre: string,
  permisosModulos: Record<string, boolean> | null | undefined
): boolean {
  if (rolNombre === 'administrador') return true
  if (permisosModulos != null) return !!permisosModulos[modulo]
  return MODULOS_ROL_DEFAULT[rolNombre]?.includes(modulo) ?? false
}

// Verificar sub-permiso específico
export function tieneSubPermiso(
  key: string,
  rolNombre: string,
  permisosModulos: Record<string, boolean> | null | undefined
): boolean {
  if (rolNombre === 'administrador') return true
  if (permisosModulos != null && key in permisosModulos) return !!permisosModulos[key]
  return !!(SUB_DEFAULT[rolNombre]?.[key] ?? false)
}
