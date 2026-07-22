export type CategoriaRespaldo =
  | 'ventas'
  | 'inventario'
  | 'compras'
  | 'proveedores'
  | 'clientes_reparaciones'
  | 'gastos_finanzas'
  | 'pedidos_b2b'
  | 'notificaciones'

interface CategoriaInfo {
  label: string
  icono: string
  descripcion: string
  /** Tablas con columna store_id que se respaldan/borran directamente por esta categoría. */
  tablas: string[]
}

export const CATEGORIAS: Record<CategoriaRespaldo, CategoriaInfo> = {
  ventas: {
    label: 'Ventas',
    icono: '🧾',
    descripcion: 'Ventas, ítems vendidos, sesiones y arqueos de caja, correcciones de caja',
    tablas: ['sales', 'sale_items', 'correcciones_caja', 'arqueos_caja', 'sesiones_caja'],
  },
  inventario: {
    label: 'Inventario',
    icono: '📦',
    descripcion: 'Productos, categorías de producto, movimientos de stock',
    tablas: ['products', 'product_categories', 'stock_movements'],
  },
  compras: {
    label: 'Compras',
    icono: '🛒',
    descripcion: 'Órdenes de compra, sus ítems y pagos, liquidaciones a proveedores',
    tablas: ['purchase_orders', 'purchase_order_items', 'purchase_order_payments', 'supplier_settlements'],
  },
  proveedores: {
    label: 'Proveedores',
    icono: '🏭',
    descripcion: 'Fichas de proveedores (requiere borrar antes Compras e Inventario si los referencian)',
    tablas: ['suppliers'],
  },
  clientes_reparaciones: {
    label: 'Clientes y reparaciones',
    icono: '🔧',
    descripcion: 'Clientes, equipos, órdenes de trabajo, comisiones de técnico, abonos y créditos de clientes',
    tablas: [
      'customers', 'equipment', 'repair_orders', 'repair_items',
      'repair_status_history', 'repair_order_services', 'repair_deposits',
      'customer_credit_payments', 'technician_commissions',
    ],
  },
  gastos_finanzas: {
    label: 'Gastos y finanzas',
    icono: '💰',
    descripcion: 'Gastos, gastos fijos, empleados del taller, pagos previsionales, cuentas y movimientos bancarios, obligaciones tributarias',
    tablas: [
      'gastos', 'gastos_extras', 'gastos_fijos', 'empleados_taller',
      'pagos_previsionales', 'cuentas_bancarias', 'movimientos_bancarios', 'obligaciones_tributarias',
    ],
  },
  pedidos_b2b: {
    label: 'Pedidos mayoristas (B2B)',
    icono: '🏬',
    descripcion: 'Pedidos de clientes mayoristas y sus pagos',
    tablas: ['sales_orders', 'sales_order_items', 'sales_order_payments'],
  },
  notificaciones: {
    label: 'Notificaciones',
    icono: '🔔',
    descripcion: 'Notificaciones internas del sistema',
    tablas: ['notifications'],
  },
}

export const CATEGORIA_KEYS = Object.keys(CATEGORIAS) as CategoriaRespaldo[]

export function esCategoriaValida(v: string): v is CategoriaRespaldo {
  return CATEGORIA_KEYS.includes(v as CategoriaRespaldo)
}

export function fraseConfirmacion(cat: CategoriaRespaldo): string {
  return `BORRAR ${CATEGORIAS[cat].label.toUpperCase()}`
}
