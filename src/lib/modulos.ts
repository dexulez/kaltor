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
    { key: 'clientes.crear',  label: 'Crear clientes',          desc: 'Registrar nuevos clientes' },
    { key: 'clientes.editar', label: 'Editar clientes',         desc: 'Modificar los datos de un cliente existente' },
  ],
  reparaciones: [
    { key: 'reparaciones.ver_todas',      label: 'Ver todas las OTs',       desc: 'Sin esto, el técnico solo ve sus OTs asignadas y las disponibles' },
    { key: 'reparaciones.adjudicar',      label: 'Adjudicarse OTs',         desc: 'Tomar OTs sin técnico asignado' },
    { key: 'reparaciones.crear',          label: 'Crear nuevas OTs',        desc: 'Registrar órdenes de trabajo nuevas' },
    { key: 'reparaciones.cobrar',         label: 'Cobrar OTs desde taller', desc: 'Acceder al botón "Cobrar en caja" en cada OT' },
    { key: 'reparaciones.descuento',      label: 'Aplicar descuentos',      desc: 'Modificar el precio final de una OT con un descuento' },
    { key: 'reparaciones.eliminar',       label: 'Eliminar OTs',            desc: 'Borrar una orden de trabajo' },
    { key: 'reparaciones.ver_costos',     label: 'Ver costo de repuestos',  desc: 'Ver el precio de costo de los repuestos usados en una OT' },
    { key: 'reparaciones.cambiar_tecnico',label: 'Reasignar técnico',       desc: 'Cambiar el técnico asignado a una OT' },
  ],
  inventario: [
    { key: 'inventario.editar',        label: 'Crear/editar productos',  desc: 'Agregar y modificar productos del inventario' },
    { key: 'inventario.ajustar_stock', label: 'Ajustar stock',           desc: 'Toma de inventario y ajustes manuales de cantidad' },
    { key: 'inventario.eliminar',      label: 'Eliminar productos',      desc: 'Borrar un producto del inventario' },
    { key: 'inventario.ver_costos',    label: 'Ver costo y margen',      desc: 'Ver el precio de costo y el margen de cada producto' },
    { key: 'inventario.carga_masiva', label: 'Carga masiva',            desc: 'Importar productos desde un archivo' },
    { key: 'inventario.categorias',   label: 'Gestionar categorías',    desc: 'Crear y editar categorías de productos' },
  ],
  caja: [
    { key: 'caja.ver_historial',         label: 'Ver historial completo',       desc: 'Ver todas las ventas del período, no solo las propias' },
    { key: 'caja.anular',                label: 'Anular ventas',                desc: 'Marcar ventas como anuladas' },
    { key: 'caja.ver_resumen_sesion',    label: 'Ver resumen de sesión',        desc: 'Ver totales, IVA, PPM y desglose por método de pago' },
    { key: 'caja.ver_comisiones',        label: 'Ver mis comisiones del día',   desc: 'Mostrar panel de comisiones generadas en la sesión' },
    { key: 'caja.crear_producto_rapido', label: 'Crear producto rápido',        desc: 'Agregar un producto nuevo directo desde el punto de venta' },
    { key: 'caja.aplicar_descuento',     label: 'Aplicar descuentos',           desc: 'Modificar el total de una venta con un descuento' },
    { key: 'caja.gestionar_sesion',      label: 'Abrir/cerrar caja',            desc: 'Iniciar y cerrar la sesión de caja del día (arqueo)' },
  ],
  compras: [
    { key: 'compras.crear',       label: 'Crear órdenes de compra', desc: 'Registrar nuevas OCs a proveedores' },
    { key: 'compras.recibir',     label: 'Recibir mercancía',        desc: 'Confirmar recepción y actualizar stock' },
    { key: 'compras.editar',      label: 'Editar órdenes de compra', desc: 'Modificar una OC ya creada' },
    { key: 'compras.pagar',       label: 'Pagar / abonar',           desc: 'Registrar pagos de una OC o abonos a un proveedor' },
    { key: 'compras.cancelar',    label: 'Cancelar/eliminar OCs',    desc: 'Cancelar o eliminar una orden de compra' },
    { key: 'compras.proveedores', label: 'Gestionar proveedores',    desc: 'Crear y editar fichas de proveedores' },
  ],
  usuarios: [
    { key: 'usuarios.crear',           label: 'Invitar usuarios',        desc: 'Enviar invitaciones a nuevos usuarios del sistema' },
    { key: 'usuarios.editar',          label: 'Editar usuarios',         desc: 'Modificar datos y rol de un usuario existente' },
    { key: 'usuarios.editar_permisos', label: 'Editar permisos finos',   desc: 'Tocar el detalle de accesos/sub-permisos de otro usuario' },
    { key: 'usuarios.eliminar',        label: 'Eliminar usuarios',       desc: 'Eliminar o desactivar la cuenta de un usuario' },
  ],
  informes: [
    { key: 'informes.solo_propios',     label: 'Solo mis datos',                  desc: 'El usuario solo ve su rendimiento personal, no el global' },
    { key: 'informes.ver_ventas',       label: 'Ver pestaña Ventas',              desc: '' },
    { key: 'informes.ver_rentabilidad', label: 'Ver pestaña Rentabilidad',        desc: '' },
    { key: 'informes.exportar',         label: 'Exportar a Excel/PDF',            desc: 'Botones de exportación en cada informe' },
    { key: 'informes.personalizado',    label: 'Crear reporte a medida',          desc: 'Acceso al constructor de reportes personalizados' },
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
    'clientes.crear': true, 'clientes.editar': true,
    'reparaciones.ver_todas': true, 'reparaciones.adjudicar': false, 'reparaciones.crear': true, 'reparaciones.cobrar': true,
    'reparaciones.descuento': true, 'reparaciones.eliminar': true, 'reparaciones.ver_costos': true, 'reparaciones.cambiar_tecnico': true,
    'inventario.editar': true, 'inventario.ajustar_stock': true,
    'inventario.eliminar': true, 'inventario.ver_costos': true, 'inventario.carga_masiva': true, 'inventario.categorias': true,
    'caja.ver_historial': true, 'caja.anular': true, 'caja.ver_resumen_sesion': true, 'caja.ver_comisiones': true,
    'caja.crear_producto_rapido': true, 'caja.aplicar_descuento': true, 'caja.gestionar_sesion': true,
    'compras.crear': true, 'compras.recibir': true, 'compras.editar': true, 'compras.pagar': true, 'compras.cancelar': true, 'compras.proveedores': true,
    'usuarios.crear': true, 'usuarios.editar': true, 'usuarios.editar_permisos': true, 'usuarios.eliminar': true,
    'informes.solo_propios': false, 'informes.ver_ventas': true, 'informes.ver_rentabilidad': true, 'informes.exportar': true, 'informes.personalizado': true,
  },
  tecnico: {
    'clientes.crear': false, 'clientes.editar': false,
    'reparaciones.ver_todas': false, 'reparaciones.adjudicar': true, 'reparaciones.crear': false, 'reparaciones.cobrar': false,
    'reparaciones.descuento': false, 'reparaciones.eliminar': false, 'reparaciones.ver_costos': true, 'reparaciones.cambiar_tecnico': false,
    'inventario.editar': false, 'inventario.ajustar_stock': false,
    'inventario.eliminar': false, 'inventario.ver_costos': true, 'inventario.carga_masiva': false, 'inventario.categorias': false,
    'caja.ver_historial': false, 'caja.anular': false, 'caja.ver_resumen_sesion': false, 'caja.ver_comisiones': true,
    'caja.crear_producto_rapido': false, 'caja.aplicar_descuento': false, 'caja.gestionar_sesion': false,
    'compras.crear': false, 'compras.recibir': false, 'compras.editar': false, 'compras.pagar': false, 'compras.cancelar': false, 'compras.proveedores': false,
    'usuarios.crear': false, 'usuarios.editar': false, 'usuarios.editar_permisos': false, 'usuarios.eliminar': false,
    'informes.solo_propios': true, 'informes.ver_ventas': false, 'informes.ver_rentabilidad': true, 'informes.exportar': true, 'informes.personalizado': false,
  },
  vendedor: {
    'clientes.crear': true, 'clientes.editar': true,
    'reparaciones.ver_todas': true, 'reparaciones.adjudicar': false, 'reparaciones.crear': true, 'reparaciones.cobrar': true,
    'reparaciones.descuento': false, 'reparaciones.eliminar': false, 'reparaciones.ver_costos': false, 'reparaciones.cambiar_tecnico': false,
    'inventario.editar': false, 'inventario.ajustar_stock': false,
    'inventario.eliminar': false, 'inventario.ver_costos': false, 'inventario.carga_masiva': false, 'inventario.categorias': false,
    'caja.ver_historial': true, 'caja.anular': false, 'caja.ver_resumen_sesion': false, 'caja.ver_comisiones': false,
    'caja.crear_producto_rapido': true, 'caja.aplicar_descuento': false, 'caja.gestionar_sesion': true,
    'compras.crear': false, 'compras.recibir': false, 'compras.editar': false, 'compras.pagar': false, 'compras.cancelar': false, 'compras.proveedores': false,
    'usuarios.crear': false, 'usuarios.editar': false, 'usuarios.editar_permisos': false, 'usuarios.eliminar': false,
    'informes.solo_propios': false, 'informes.ver_ventas': true, 'informes.ver_rentabilidad': false, 'informes.exportar': true, 'informes.personalizado': false,
  },
  supervisor_ventas: {
    'clientes.crear': true, 'clientes.editar': true,
    'reparaciones.ver_todas': true, 'reparaciones.adjudicar': false, 'reparaciones.crear': true, 'reparaciones.cobrar': true,
    'reparaciones.descuento': true, 'reparaciones.eliminar': false, 'reparaciones.ver_costos': true, 'reparaciones.cambiar_tecnico': true,
    'inventario.editar': false, 'inventario.ajustar_stock': true,
    'inventario.eliminar': true, 'inventario.ver_costos': true, 'inventario.carga_masiva': true, 'inventario.categorias': true,
    'caja.ver_historial': true, 'caja.anular': true, 'caja.ver_resumen_sesion': true, 'caja.ver_comisiones': true,
    'caja.crear_producto_rapido': true, 'caja.aplicar_descuento': true, 'caja.gestionar_sesion': true,
    'compras.crear': true, 'compras.recibir': true, 'compras.editar': true, 'compras.pagar': true, 'compras.cancelar': false, 'compras.proveedores': true,
    'usuarios.crear': false, 'usuarios.editar': false, 'usuarios.editar_permisos': false, 'usuarios.eliminar': false,
    'informes.solo_propios': false, 'informes.ver_ventas': true, 'informes.ver_rentabilidad': true, 'informes.exportar': true, 'informes.personalizado': true,
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
