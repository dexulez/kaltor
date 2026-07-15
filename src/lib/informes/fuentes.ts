import { tieneSubPermiso } from '@/lib/modulos'

export type TipoCampo = 'texto' | 'numero' | 'clp' | 'fecha' | 'bool'

export interface CampoFuente {
  /** Ruta (dot-path) dentro de la fila devuelta por Supabase. */
  key: string
  label: string
  tipo: TipoCampo
}

export interface FiltroFuente {
  columna: string
  label: string
  opciones: { value: string; label: string }[]
  /** Si está presente, las opciones se cargan en tiempo real desde esta tabla en vez de usar `opciones`. */
  fuenteDinamica?: { tabla: string; valorCampo: string; labelCampo: string }
}

export interface FuenteReporte {
  key: string
  label: string
  tabla: string
  select: string
  /** Columna usada para el filtro de rango de fechas (desde/hasta). */
  campoFecha?: string
  filtros?: FiltroFuente[]
  campos: CampoFuente[]
  /** Sub-permiso adicional (además de acceso al módulo "informes") requerido para usar esta fuente. */
  permiso?: string
  /** Columna a restringir por el usuario actual cuando tiene el sub-permiso "informes.solo_propios". */
  soloPropiosColumna?: string
}

export const FUENTES: FuenteReporte[] = [
  {
    key: 'ventas',
    label: 'Ventas',
    tabla: 'sales',
    select: 'numero_venta, created_at, tipo, metodo_pago, tipo_documento, subtotal, iva, ppm, total, comision_bancaria, anulada, customer_id, usuario_id, customers(nombre), usuario:user_profiles(nombre_completo)',
    campoFecha: 'created_at',
    permiso: 'informes.ver_ventas',
    soloPropiosColumna: 'usuario_id',
    filtros: [{
      columna: 'tipo', label: 'Tipo de venta',
      opciones: [{ value: 'reparacion', label: 'Reparación' }, { value: 'directa', label: 'Venta directa' }],
    }],
    campos: [
      { key: 'numero_venta', label: 'N° Venta', tipo: 'texto' },
      { key: 'created_at', label: 'Fecha', tipo: 'fecha' },
      { key: 'tipo', label: 'Tipo', tipo: 'texto' },
      { key: 'customers.nombre', label: 'Cliente', tipo: 'texto' },
      { key: 'metodo_pago', label: 'Método de pago', tipo: 'texto' },
      { key: 'tipo_documento', label: 'Documento', tipo: 'texto' },
      { key: 'subtotal', label: 'Subtotal', tipo: 'clp' },
      { key: 'iva', label: 'IVA', tipo: 'clp' },
      { key: 'ppm', label: 'PPM', tipo: 'clp' },
      { key: 'total', label: 'Total', tipo: 'clp' },
      { key: 'comision_bancaria', label: 'Comisión bancaria', tipo: 'clp' },
      { key: 'anulada', label: 'Anulada', tipo: 'bool' },
      { key: 'usuario.nombre_completo', label: 'Vendedor', tipo: 'texto' },
    ],
  },
  {
    key: 'reparaciones',
    label: 'Reparaciones (OTs)',
    tabla: 'repair_orders',
    select: 'numero_ot, created_at, estado, tipo_reparacion, precio_servicio, presupuesto_estimado, resultado, metodo_pago, fecha_entrega, fecha_estimada_entrega, tecnico_id, customers(nombre), equipment(marca, modelo), tecnico:user_profiles(nombre_completo)',
    campoFecha: 'created_at',
    soloPropiosColumna: 'tecnico_id',
    filtros: [{
      columna: 'estado', label: 'Estado',
      opciones: [
        'recibido', 'en_diagnostico', 'presupuestado', 'aprobado', 'rechazado',
        'esperando_repuesto', 'en_reparacion', 'listo', 'entregado', 'en_garantia', 'cancelado',
      ].map(v => ({ value: v, label: v.replace(/_/g, ' ') })),
    }],
    campos: [
      { key: 'numero_ot', label: 'N° OT', tipo: 'texto' },
      { key: 'created_at', label: 'Fecha recepción', tipo: 'fecha' },
      { key: 'estado', label: 'Estado', tipo: 'texto' },
      { key: 'tipo_reparacion', label: 'Tipo de reparación', tipo: 'texto' },
      { key: 'customers.nombre', label: 'Cliente', tipo: 'texto' },
      { key: 'equipment.marca', label: 'Marca', tipo: 'texto' },
      { key: 'equipment.modelo', label: 'Modelo', tipo: 'texto' },
      { key: 'tecnico.nombre_completo', label: 'Técnico', tipo: 'texto' },
      { key: 'precio_servicio', label: 'Precio servicio', tipo: 'clp' },
      { key: 'presupuesto_estimado', label: 'Presupuesto estimado', tipo: 'clp' },
      { key: 'resultado', label: 'Resultado', tipo: 'texto' },
      { key: 'metodo_pago', label: 'Método de pago', tipo: 'texto' },
      { key: 'fecha_entrega', label: 'Fecha entrega', tipo: 'fecha' },
    ],
  },
  {
    key: 'clientes',
    label: 'Clientes',
    tabla: 'customers',
    select: 'nombre, telefono, email, rut, direccion, activo, created_at',
    campoFecha: 'created_at',
    filtros: [{
      columna: 'activo', label: 'Estado',
      opciones: [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }],
    }],
    campos: [
      { key: 'nombre', label: 'Nombre', tipo: 'texto' },
      { key: 'telefono', label: 'Teléfono', tipo: 'texto' },
      { key: 'email', label: 'Email', tipo: 'texto' },
      { key: 'rut', label: 'RUT', tipo: 'texto' },
      { key: 'direccion', label: 'Dirección', tipo: 'texto' },
      { key: 'activo', label: 'Activo', tipo: 'bool' },
      { key: 'created_at', label: 'Registrado el', tipo: 'fecha' },
    ],
  },
  {
    key: 'productos',
    label: 'Productos / Inventario',
    tabla: 'products',
    select: 'sku, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, activo, created_at, categoria_id, categoria:product_categories(nombre), proveedor:suppliers(nombre)',
    campoFecha: 'created_at',
    filtros: [
      {
        columna: 'activo', label: 'Estado',
        opciones: [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }],
      },
      {
        columna: 'categoria_id', label: 'Categoría', opciones: [],
        fuenteDinamica: { tabla: 'product_categories', valorCampo: 'id', labelCampo: 'nombre' },
      },
    ],
    campos: [
      { key: 'sku', label: 'SKU', tipo: 'texto' },
      { key: 'nombre', label: 'Nombre', tipo: 'texto' },
      { key: 'categoria.nombre', label: 'Categoría', tipo: 'texto' },
      { key: 'proveedor.nombre', label: 'Proveedor', tipo: 'texto' },
      { key: 'stock_actual', label: 'Stock actual', tipo: 'numero' },
      { key: 'stock_minimo', label: 'Stock mínimo', tipo: 'numero' },
      { key: 'precio_costo', label: 'Precio costo', tipo: 'clp' },
      { key: 'precio_venta', label: 'Precio venta', tipo: 'clp' },
      { key: 'activo', label: 'Activo', tipo: 'bool' },
      { key: 'created_at', label: 'Creado el', tipo: 'fecha' },
    ],
  },
  {
    key: 'movimientos_stock',
    label: 'Movimientos de stock',
    tabla: 'stock_movements',
    select: 'created_at, tipo, cantidad, stock_anterior, stock_nuevo, razon, products(nombre), usuario:user_profiles(nombre_completo)',
    campoFecha: 'created_at',
    filtros: [{
      columna: 'tipo', label: 'Tipo de movimiento',
      opciones: [{ value: 'entrada', label: 'Entrada' }, { value: 'salida', label: 'Salida' }, { value: 'ajuste', label: 'Ajuste' }],
    }],
    campos: [
      { key: 'created_at', label: 'Fecha', tipo: 'fecha' },
      { key: 'tipo', label: 'Tipo', tipo: 'texto' },
      { key: 'products.nombre', label: 'Producto', tipo: 'texto' },
      { key: 'cantidad', label: 'Cantidad', tipo: 'numero' },
      { key: 'stock_anterior', label: 'Stock anterior', tipo: 'numero' },
      { key: 'stock_nuevo', label: 'Stock nuevo', tipo: 'numero' },
      { key: 'razon', label: 'Razón', tipo: 'texto' },
      { key: 'usuario.nombre_completo', label: 'Usuario', tipo: 'texto' },
    ],
  },
  {
    key: 'compras',
    label: 'Compras (OCs)',
    tabla: 'purchase_orders',
    select: 'numero_oc, created_at, estado, total, costo_envio_total, fecha_estimada_llegada, fecha_recepcion, suppliers(nombre)',
    campoFecha: 'created_at',
    filtros: [{
      columna: 'estado', label: 'Estado',
      opciones: ['pendiente', 'en_transito', 'recibida_parcial', 'recibida_completa', 'cancelada'].map(v => ({ value: v, label: v.replace(/_/g, ' ') })),
    }],
    campos: [
      { key: 'numero_oc', label: 'N° OC', tipo: 'texto' },
      { key: 'created_at', label: 'Fecha', tipo: 'fecha' },
      { key: 'suppliers.nombre', label: 'Proveedor', tipo: 'texto' },
      { key: 'estado', label: 'Estado', tipo: 'texto' },
      { key: 'total', label: 'Total', tipo: 'clp' },
      { key: 'costo_envio_total', label: 'Costo envío', tipo: 'clp' },
      { key: 'fecha_estimada_llegada', label: 'Fecha estimada llegada', tipo: 'fecha' },
      { key: 'fecha_recepcion', label: 'Fecha recepción', tipo: 'fecha' },
    ],
  },
  {
    key: 'gastos',
    label: 'Gastos operacionales',
    tabla: 'gastos',
    select: 'fecha, concepto, categoria, metodo_pago, monto',
    campoFecha: 'fecha',
    campos: [
      { key: 'fecha', label: 'Fecha', tipo: 'fecha' },
      { key: 'concepto', label: 'Concepto', tipo: 'texto' },
      { key: 'categoria', label: 'Categoría', tipo: 'texto' },
      { key: 'metodo_pago', label: 'Método de pago', tipo: 'texto' },
      { key: 'monto', label: 'Monto', tipo: 'clp' },
    ],
  },
  {
    key: 'comisiones',
    label: 'Comisiones técnicos',
    tabla: 'technician_commissions',
    select: 'created_at, precio_servicio, costo_repuestos, comision_bruta, comision_neta, pagada, fecha_pago, tecnico_id, tecnico:user_profiles(nombre_completo), repair_orders(numero_ot)',
    campoFecha: 'created_at',
    permiso: 'informes.ver_rentabilidad',
    soloPropiosColumna: 'tecnico_id',
    filtros: [{
      columna: 'pagada', label: 'Estado de pago',
      opciones: [{ value: 'true', label: 'Pagada' }, { value: 'false', label: 'Pendiente' }],
    }],
    campos: [
      { key: 'created_at', label: 'Fecha', tipo: 'fecha' },
      { key: 'repair_orders.numero_ot', label: 'N° OT', tipo: 'texto' },
      { key: 'tecnico.nombre_completo', label: 'Técnico', tipo: 'texto' },
      { key: 'precio_servicio', label: 'Precio servicio', tipo: 'clp' },
      { key: 'costo_repuestos', label: 'Costo repuestos', tipo: 'clp' },
      { key: 'comision_bruta', label: 'Comisión bruta', tipo: 'clp' },
      { key: 'comision_neta', label: 'Comisión neta', tipo: 'clp' },
      { key: 'pagada', label: 'Pagada', tipo: 'bool' },
      { key: 'fecha_pago', label: 'Fecha de pago', tipo: 'fecha' },
    ],
  },
]

export function obtenerFuente(key: string): FuenteReporte | undefined {
  return FUENTES.find(f => f.key === key)
}

export function fuentesPermitidas(rol: string, permisos: Record<string, boolean> | null | undefined): FuenteReporte[] {
  return FUENTES.filter(f => !f.permiso || rol === 'administrador' || tieneSubPermiso(f.permiso, rol, permisos))
}

/** Resuelve un dot-path dentro de una fila de Supabase, desenvolviendo relaciones que vengan como array. */
export function obtenerValorPorRuta(fila: Record<string, unknown>, ruta: string): unknown {
  const partes = ruta.split('.')
  let actual: unknown = fila
  for (const parte of partes) {
    if (actual === null || actual === undefined) return null
    if (Array.isArray(actual)) actual = actual[0]
    actual = (actual as Record<string, unknown>)[parte]
  }
  return actual ?? null
}
