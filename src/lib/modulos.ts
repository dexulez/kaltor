// ── Los 9 módulos de negocio que gatean acceso por plan ──────────────────────
// Estos son los keys que viven en store_modules / plan_modules.
// dashboard y notificaciones no están aquí: son utilidades siempre presentes.
export const MODULO_NEGOCIO_KEYS = [
  'ventas', 'compras', 'productos', 'servicios', 'taller',
  'informes', 'contabilidad', 'configuracion', 'canal_b2b', 'trazabilidad', 'manuales',
] as const
export type ModuloNegocio = typeof MODULO_NEGOCIO_KEYS[number]

// ── Items de navegación ───────────────────────────────────────────────────────
// `modulo` → módulo de negocio (store_modules) que gatea la visibilidad.
// null    → siempre visible, no depende del plan (core).
export const MODULOS = [
  { key: 'dashboard',     label: 'Dashboard',            icon: '📊', href: '/dashboard',     modulo: null             },
  { key: 'caja',          label: 'Caja / Ventas',        icon: '💰', href: '/caja',          modulo: 'ventas'         },
  { key: 'clientes',      label: 'Clientes',             icon: '👤', href: '/clientes',      modulo: 'ventas'         },
  { key: 'compras',       label: 'Órdenes de Compra',    icon: '🏭', href: '/compras',       modulo: 'compras'        },
  { key: 'proveedores',   label: 'Proveedores',          icon: '🤝', href: '/proveedores',   modulo: 'compras'        },
  { key: 'inventario',    label: 'Inventario',           icon: '📦', href: '/inventario',    modulo: 'productos'      },
  { key: 'servicios',     label: 'Catálogo de Servicios',icon: '🔩', href: '/servicios',     modulo: 'servicios'      },
  { key: 'reparaciones',  label: 'Reparaciones',         icon: '🔧', href: '/reparaciones',  modulo: 'taller'         },
  { key: 'informes',      label: 'Informes',             icon: '📈', href: '/informes',      modulo: 'informes'       },
  { key: 'contabilidad',  label: 'Contabilidad',         icon: '🧾', href: '/contabilidad',  modulo: 'contabilidad'   },
  { key: 'bancos',        label: 'Bancos',               icon: '🏦', href: '/bancos',         modulo: 'contabilidad'   },
  { key: 'catalogo_b2b',  label: 'Catálogo B2B',         icon: '🛍️', href: '/catalogo-b2b',  modulo: 'canal_b2b'      },
  { key: 'pedidos_b2b',   label: 'Pedidos B2B',          icon: '📥', href: '/pedidos-b2b',   modulo: 'canal_b2b'      },
  { key: 'manuales',      label: 'Manuales',             icon: '🧠', href: '/manuales',      modulo: 'manuales'       },
  { key: 'usuarios',      label: 'Usuarios',             icon: '👥', href: '/usuarios',      modulo: null             },
  { key: 'configuracion', label: 'Configuración',        icon: '⚙️', href: '/configuracion', modulo: null             },
  { key: 'notificaciones',label: 'Notificaciones',       icon: '🔔', href: '/notificaciones',modulo: null             },
  { key: 'trazabilidad',  label: 'Trazabilidad',         icon: '🔍', href: '/trazabilidad',   modulo: 'trazabilidad'   },
] as const satisfies ReadonlyArray<{
  key: string; label: string; icon: string; href: string; modulo: ModuloNegocio | null
}>

export type ModuloKey = typeof MODULOS[number]['key']

// ── Módulo de negocio requerido para acceder a una ruta ──────────────────────
// Usado por el middleware para bloquear el acceso directo (por URL) a páginas
// que no correspondan al plan de la tienda, no solo ocultarlas del menú.
export function moduloRequeridoPara(pathname: string): ModuloNegocio | null {
  for (const item of MODULOS) {
    if (item.modulo === null) continue
    if (pathname === item.href || pathname.startsWith(item.href + '/')) return item.modulo
  }
  return null
}

// ── Agrupación visual del sidebar ────────────────────────────────────────────
// Refleja los 9 módulos de negocio. Standalone = sin encabezado colapsable.
export interface MenuGroup {
  key: string
  label: string
  icon: string
  modulos: ModuloKey[]
  standalone?: boolean
}

export const MENU_GROUPS: MenuGroup[] = [
  { key: 'ventas',       label: 'Ventas',        icon: '💰', modulos: ['caja', 'clientes'] },
  { key: 'compras',      label: 'Compras',       icon: '🏭', modulos: ['compras', 'proveedores'] },
  { key: 'productos',    label: 'Productos',     icon: '📦', modulos: ['inventario'], standalone: true },
  { key: 'taller',       label: 'Taller',        icon: '🔧', modulos: ['reparaciones', 'servicios'] },
  { key: 'canal_b2b',    label: 'Canal B2B',     icon: '🛍️', modulos: ['catalogo_b2b', 'pedidos_b2b'] },
  { key: 'informes',     label: 'Informes',      icon: '📈', modulos: ['informes'], standalone: true },
  { key: 'contabilidad', label: 'Contabilidad',  icon: '🧾', modulos: ['contabilidad', 'bancos'] },
  { key: 'configuracion',  label: 'Configuración', icon: '⚙️', modulos: ['configuracion', 'usuarios', 'manuales', 'notificaciones'] },
  { key: 'trazabilidad',  label: 'Trazabilidad',  icon: '🔍', modulos: ['trazabilidad'], standalone: true },
]

// ── Sub-permisos por módulo ───────────────────────────────────────────────────
export const SUB_PERMISOS: Partial<Record<ModuloKey, { key: string; label: string; desc: string }[]>> = {
  clientes: [
    { key: 'clientes.crear',    label: 'Crear clientes',    desc: 'Registrar nuevos clientes' },
    { key: 'clientes.editar',   label: 'Editar clientes',   desc: 'Modificar los datos de un cliente existente' },
    { key: 'clientes.eliminar', label: 'Eliminar clientes', desc: 'Dar de baja a un cliente (no borra su historial de OTs/ventas)' },
    { key: 'clientes.otorgar_credito', label: 'Otorgar crédito',   desc: 'Habilitar el fiado y fijar el límite de crédito de un cliente' },
    { key: 'clientes.cobrar_credito',  label: 'Cobrar/abonar crédito', desc: 'Vender a crédito (fiado) y registrar abonos a la deuda del cliente' },
  ],
  reparaciones: [
    { key: 'reparaciones.ver_todas',       label: 'Ver todas las OTs',       desc: 'Sin esto, el técnico solo ve sus OTs asignadas y las disponibles' },
    { key: 'reparaciones.adjudicar',       label: 'Adjudicarse OTs',         desc: 'Tomar OTs sin técnico asignado' },
    { key: 'reparaciones.crear',           label: 'Crear nuevas OTs',        desc: 'Registrar órdenes de trabajo nuevas' },
    { key: 'reparaciones.cobrar',          label: 'Cobrar OTs desde taller', desc: 'Acceder al botón "Cobrar en caja" en cada OT' },
    { key: 'reparaciones.descuento',       label: 'Aplicar descuentos',      desc: 'Modificar el precio final de una OT con un descuento' },
    { key: 'reparaciones.eliminar',        label: 'Eliminar OTs',            desc: 'Borrar una orden de trabajo' },
    { key: 'reparaciones.ver_costos',      label: 'Ver costo de repuestos',  desc: 'Ver el precio de costo de los repuestos usados en una OT' },
    { key: 'reparaciones.cambiar_tecnico', label: 'Reasignar técnico',       desc: 'Cambiar el técnico asignado a una OT' },
  ],
  inventario: [
    { key: 'inventario.editar',        label: 'Crear/editar productos',  desc: 'Agregar y modificar productos del inventario' },
    { key: 'inventario.ajustar_stock', label: 'Ajustar stock',           desc: 'Toma de inventario y ajustes manuales de cantidad' },
    { key: 'inventario.eliminar',      label: 'Eliminar productos',      desc: 'Borrar un producto del inventario' },
    { key: 'inventario.ver_costos',    label: 'Ver costo y margen',      desc: 'Ver el precio de costo y el margen de cada producto' },
    { key: 'inventario.carga_masiva',  label: 'Carga masiva',            desc: 'Importar productos desde un archivo' },
    { key: 'inventario.categorias',    label: 'Gestionar categorías',    desc: 'Crear y editar categorías de productos' },
  ],
  caja: [
    { key: 'caja.ver_historial',         label: 'Ver historial completo',     desc: 'Ver todas las ventas del período, no solo las propias' },
    { key: 'caja.anular',                label: 'Anular ventas',              desc: 'Marcar ventas como anuladas' },
    { key: 'caja.ver_resumen_sesion',    label: 'Ver resumen de sesión',      desc: 'Ver totales, IVA, PPM y desglose por método de pago' },
    { key: 'caja.ver_comisiones',        label: 'Ver mis comisiones del día', desc: 'Mostrar panel de comisiones generadas en la sesión' },
    { key: 'caja.crear_producto_rapido', label: 'Crear producto rápido',      desc: 'Agregar un producto nuevo directo desde el punto de venta' },
    { key: 'caja.aplicar_descuento',     label: 'Aplicar descuentos',         desc: 'Modificar el total de una venta con un descuento' },
    { key: 'caja.gestionar_sesion',      label: 'Abrir/cerrar caja',          desc: 'Iniciar y cerrar la sesión de caja del día (arqueo)' },
  ],
  compras: [
    { key: 'compras.crear',       label: 'Crear órdenes de compra',  desc: 'Registrar nuevas OCs a proveedores' },
    { key: 'compras.recibir',     label: 'Recibir mercancía',         desc: 'Confirmar recepción y actualizar stock' },
    { key: 'compras.editar',      label: 'Editar órdenes de compra',  desc: 'Modificar una OC ya creada' },
    { key: 'compras.editar_recibidas', label: 'Editar OCs ya recibidas', desc: 'Modificar una orden de compra después de marcada como recibida' },
    { key: 'compras.pagar',       label: 'Pagar / abonar',            desc: 'Registrar pagos de una OC o abonos a un proveedor' },
    { key: 'compras.cancelar',    label: 'Cancelar/eliminar OCs',     desc: 'Cancelar o eliminar una orden de compra' },
    { key: 'compras.proveedores', label: 'Gestionar proveedores',     desc: 'Crear y editar fichas de proveedores' },
  ],
  usuarios: [
    { key: 'usuarios.crear',           label: 'Invitar usuarios',      desc: 'Enviar invitaciones a nuevos usuarios del sistema' },
    { key: 'usuarios.editar',          label: 'Editar usuarios',       desc: 'Modificar datos y rol de un usuario existente' },
    { key: 'usuarios.editar_permisos', label: 'Editar permisos finos', desc: 'Tocar el detalle de accesos/sub-permisos de otro usuario' },
    { key: 'usuarios.eliminar',        label: 'Eliminar usuarios',     desc: 'Eliminar o desactivar la cuenta de un usuario' },
  ],
  informes: [
    { key: 'informes.solo_propios',     label: 'Solo mis datos',              desc: 'El usuario solo ve su rendimiento personal, no el global' },
    { key: 'informes.ver_ventas',       label: 'Ver pestaña Ventas',          desc: '' },
    { key: 'informes.ver_rentabilidad', label: 'Ver pestaña Rentabilidad',    desc: '' },
    { key: 'informes.exportar',         label: 'Exportar a Excel/PDF',        desc: 'Botones de exportación en cada informe' },
    { key: 'informes.personalizado',    label: 'Crear reporte a medida',      desc: 'Acceso al constructor de reportes personalizados' },
  ],
}

// ── Acceso a módulos por rol (items de menú) ──────────────────────────────────
// Controla qué items de navegación puede ver cada rol, independientemente del plan.
export const MODULOS_ROL_DEFAULT: Record<string, ModuloKey[]> = {
  administrador:     ['dashboard', 'caja', 'clientes', 'compras', 'proveedores', 'inventario', 'servicios', 'reparaciones', 'informes', 'contabilidad', 'bancos', 'catalogo_b2b', 'pedidos_b2b', 'manuales', 'usuarios', 'configuracion', 'notificaciones', 'trazabilidad'],
  tecnico:           ['dashboard', 'reparaciones', 'inventario', 'servicios', 'manuales', 'informes', 'notificaciones'],
  vendedor:          ['dashboard', 'caja', 'clientes', 'reparaciones', 'inventario', 'servicios', 'informes', 'pedidos_b2b', 'notificaciones'],
  supervisor_ventas: ['dashboard', 'caja', 'clientes', 'compras', 'proveedores', 'inventario', 'servicios', 'reparaciones', 'manuales', 'informes', 'pedidos_b2b', 'notificaciones', 'trazabilidad'],
  comprador_externo: ['catalogo_b2b', 'pedidos_b2b'],
}

// ── Sub-permisos por defecto según rol ───────────────────────────────────────
const SUB_DEFAULT: Record<string, Record<string, boolean>> = {
  administrador: {
    'clientes.crear': true, 'clientes.editar': true, 'clientes.eliminar': true,
    'clientes.otorgar_credito': true, 'clientes.cobrar_credito': true,
    'reparaciones.ver_todas': true, 'reparaciones.adjudicar': false, 'reparaciones.crear': true, 'reparaciones.cobrar': true,
    'reparaciones.descuento': true, 'reparaciones.eliminar': true, 'reparaciones.ver_costos': true, 'reparaciones.cambiar_tecnico': true,
    'inventario.editar': true, 'inventario.ajustar_stock': true,
    'inventario.eliminar': true, 'inventario.ver_costos': true, 'inventario.carga_masiva': true, 'inventario.categorias': true,
    'caja.ver_historial': true, 'caja.anular': true, 'caja.ver_resumen_sesion': true, 'caja.ver_comisiones': true,
    'caja.crear_producto_rapido': true, 'caja.aplicar_descuento': true, 'caja.gestionar_sesion': true,
    'compras.crear': true, 'compras.recibir': true, 'compras.editar': true, 'compras.editar_recibidas': true, 'compras.pagar': true, 'compras.cancelar': true, 'compras.proveedores': true,
    'usuarios.crear': true, 'usuarios.editar': true, 'usuarios.editar_permisos': true, 'usuarios.eliminar': true,
    'informes.solo_propios': false, 'informes.ver_ventas': true, 'informes.ver_rentabilidad': true, 'informes.exportar': true, 'informes.personalizado': true,
  },
  tecnico: {
    'clientes.crear': false, 'clientes.editar': false, 'clientes.eliminar': false,
    'clientes.otorgar_credito': false, 'clientes.cobrar_credito': false,
    'reparaciones.ver_todas': false, 'reparaciones.adjudicar': true, 'reparaciones.crear': false, 'reparaciones.cobrar': false,
    'reparaciones.descuento': false, 'reparaciones.eliminar': false, 'reparaciones.ver_costos': true, 'reparaciones.cambiar_tecnico': false,
    'inventario.editar': false, 'inventario.ajustar_stock': false,
    'inventario.eliminar': false, 'inventario.ver_costos': true, 'inventario.carga_masiva': false, 'inventario.categorias': false,
    'caja.ver_historial': false, 'caja.anular': false, 'caja.ver_resumen_sesion': false, 'caja.ver_comisiones': true,
    'caja.crear_producto_rapido': false, 'caja.aplicar_descuento': false, 'caja.gestionar_sesion': false,
    'compras.crear': false, 'compras.recibir': false, 'compras.editar': false, 'compras.editar_recibidas': false, 'compras.pagar': false, 'compras.cancelar': false, 'compras.proveedores': false,
    'usuarios.crear': false, 'usuarios.editar': false, 'usuarios.editar_permisos': false, 'usuarios.eliminar': false,
    'informes.solo_propios': true, 'informes.ver_ventas': false, 'informes.ver_rentabilidad': true, 'informes.exportar': true, 'informes.personalizado': false,
  },
  vendedor: {
    'clientes.crear': true, 'clientes.editar': true, 'clientes.eliminar': false,
    'clientes.otorgar_credito': false, 'clientes.cobrar_credito': true,
    'reparaciones.ver_todas': true, 'reparaciones.adjudicar': false, 'reparaciones.crear': true, 'reparaciones.cobrar': true,
    'reparaciones.descuento': false, 'reparaciones.eliminar': false, 'reparaciones.ver_costos': false, 'reparaciones.cambiar_tecnico': false,
    'inventario.editar': false, 'inventario.ajustar_stock': false,
    'inventario.eliminar': false, 'inventario.ver_costos': false, 'inventario.carga_masiva': false, 'inventario.categorias': false,
    'caja.ver_historial': true, 'caja.anular': false, 'caja.ver_resumen_sesion': false, 'caja.ver_comisiones': false,
    'caja.crear_producto_rapido': true, 'caja.aplicar_descuento': false, 'caja.gestionar_sesion': true,
    'compras.crear': false, 'compras.recibir': false, 'compras.editar': false, 'compras.editar_recibidas': false, 'compras.pagar': false, 'compras.cancelar': false, 'compras.proveedores': false,
    'usuarios.crear': false, 'usuarios.editar': false, 'usuarios.editar_permisos': false, 'usuarios.eliminar': false,
    'informes.solo_propios': false, 'informes.ver_ventas': true, 'informes.ver_rentabilidad': false, 'informes.exportar': true, 'informes.personalizado': false,
  },
  supervisor_ventas: {
    'clientes.crear': true, 'clientes.editar': true, 'clientes.eliminar': true,
    'clientes.otorgar_credito': true, 'clientes.cobrar_credito': true,
    'reparaciones.ver_todas': true, 'reparaciones.adjudicar': false, 'reparaciones.crear': true, 'reparaciones.cobrar': true,
    'reparaciones.descuento': true, 'reparaciones.eliminar': false, 'reparaciones.ver_costos': true, 'reparaciones.cambiar_tecnico': true,
    'inventario.editar': false, 'inventario.ajustar_stock': true,
    'inventario.eliminar': true, 'inventario.ver_costos': true, 'inventario.carga_masiva': true, 'inventario.categorias': true,
    'caja.ver_historial': true, 'caja.anular': true, 'caja.ver_resumen_sesion': true, 'caja.ver_comisiones': true,
    'caja.crear_producto_rapido': true, 'caja.aplicar_descuento': true, 'caja.gestionar_sesion': true,
    'compras.crear': true, 'compras.recibir': true, 'compras.editar': true, 'compras.editar_recibidas': false, 'compras.pagar': true, 'compras.cancelar': false, 'compras.proveedores': true,
    'usuarios.crear': false, 'usuarios.editar': false, 'usuarios.editar_permisos': false, 'usuarios.eliminar': false,
    'informes.solo_propios': false, 'informes.ver_ventas': true, 'informes.ver_rentabilidad': true, 'informes.exportar': true, 'informes.personalizado': true,
  },
}

export function getDefaultPermisos(rolNombre: string): Record<string, boolean> {
  const modDefaults = MODULOS_ROL_DEFAULT[rolNombre] ?? []
  const modPerms = Object.fromEntries(MODULOS.map(m => [m.key, modDefaults.includes(m.key)]))
  return { ...modPerms, ...(SUB_DEFAULT[rolNombre] ?? {}) }
}

// ── Verificar acceso a un item de menú por rol ───────────────────────────────
// El filtro de plan (store_modules) se aplica por separado en AppSidebar/MobileNav
// comparando m.modulo con el Set<ModuloNegocio> activo del plan.
export function tieneAccesoModulo(
  modulo: ModuloKey,
  rolNombre: string,
  permisosModulos: Record<string, boolean> | null | undefined
): boolean {
  if (rolNombre === 'administrador') return true
  if (permisosModulos != null) return !!permisosModulos[modulo]
  return MODULOS_ROL_DEFAULT[rolNombre]?.includes(modulo) ?? false
}

export function tieneSubPermiso(
  key: string,
  rolNombre: string,
  permisosModulos: Record<string, boolean> | null | undefined
): boolean {
  if (rolNombre === 'administrador') return true
  if (permisosModulos != null && key in permisosModulos) return !!permisosModulos[key]
  return !!(SUB_DEFAULT[rolNombre]?.[key] ?? false)
}
