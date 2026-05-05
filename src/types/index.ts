export type RepairStatus =
  | 'recibido'
  | 'en_diagnostico'
  | 'presupuestado'
  | 'aprobado'
  | 'rechazado'
  | 'esperando_repuesto'
  | 'en_reparacion'
  | 'listo'
  | 'entregado'
  | 'en_garantia'
  | 'cancelado'

export type RepairType =
  | 'pantalla' | 'bateria' | 'placa' | 'software'
  | 'camara' | 'conector' | 'otro'

export type UserRole = 'administrador' | 'tecnico' | 'vendedor'

export type PaymentMethod = 'efectivo' | 'transferencia' | 'debito' | 'credito'

export type DocumentType = 'boleta' | 'factura'

export type ProductCategoryType = 'repuesto' | 'accesorio' | 'equipo_usado' | 'insumo'

export interface Role {
  id: string
  nombre: string
  descripcion?: string
  permisos: Record<string, string>
  es_sistema: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  nombre_completo: string
  email: string
  telefono?: string
  rol_id?: string
  comision_base: number
  comision_pantalla: number
  comision_bateria: number
  comision_placa: number
  comision_software: number
  comision_camara: number
  comision_conector: number
  comision_otro: number
  activo: boolean
  created_at: string
  updated_at: string
  roles?: Role
}

export interface SystemConfig {
  id: string
  nombre_local: string
  rut_local?: string
  direccion?: string
  telefono?: string
  email?: string
  whatsapp?: string
  logo_url?: string
  iva: number
  ppm: number
  comision_debito: number
  comision_credito: number
  comision_transferencia: number
  dias_garantia_default: number
  moneda: string
  mostrar_precio_en_presupuesto: boolean
}

export interface Customer {
  id: string
  nombre: string
  telefono: string
  email?: string
  rut?: string
  direccion?: string
  notas?: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  customer_id: string
  marca: string
  modelo: string
  imei?: string
  color?: string
  capacidad?: string
  accesorios: string[]
  condicion_visual: string[]
  observaciones?: string
  falla_reportada: string
  fotos: string[]
  created_at: string
  customers?: Customer
}

export interface RepairOrder {
  id: string
  numero_ot: string
  codigo_seguimiento: string
  customer_id: string
  equipment_id: string
  tecnico_id?: string
  estado: RepairStatus
  tipo_reparacion?: RepairType
  presupuesto_estimado?: number
  precio_servicio?: number
  diagnostico_tecnico?: string
  resultado?: 'exitosa' | 'no_exitosa'
  comentario_resultado?: string
  dias_garantia: number
  fecha_garantia_hasta?: string
  metodo_pago?: PaymentMethod
  iva_aplicado?: number
  ppm_aplicado?: number
  created_at: string
  updated_at: string
  fecha_entrega?: string
  customers?: Customer
  equipment?: Equipment
  user_profiles?: UserProfile
  repair_items?: RepairItem[]
}

export interface RepairStatusHistory {
  id: string
  repair_order_id: string
  estado_anterior?: RepairStatus
  estado_nuevo: RepairStatus
  comentario?: string
  usuario_id?: string
  created_at: string
  user_profiles?: UserProfile
}

export interface RepairItem {
  id: string
  repair_order_id: string
  product_id?: string
  nombre: string
  cantidad: number
  precio_costo: number
  costo_envio: number
  created_at: string
}

export interface ProductCategory {
  id: string
  nombre: string
  tipo: ProductCategoryType
  vendible: boolean
  descripcion?: string
}

export interface Supplier {
  id: string
  nombre: string
  razon_social?: string
  rut?: string
  contacto_nombre?: string
  telefono?: string
  email?: string
  whatsapp?: string
  pais: string
  ciudad?: string
  direccion?: string
  condicion_pago: 'contado' | 'credito' | 'cuotas'
  plazo_pago_dias: number
  saldo_deudor: number
  calificacion?: number
  activo: boolean
  notas?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  sku?: string
  nombre: string
  descripcion?: string
  categoria_id: string
  proveedor_id?: string
  compatibilidad: string[]
  stock_actual: number
  stock_minimo: number
  precio_costo: number
  costo_envio: number
  precio_venta: number
  precio_incluye_iva: boolean
  ubicacion_bodega?: string
  numero_serie?: string
  imei?: string
  activo: boolean
  created_at: string
  updated_at: string
  product_categories?: ProductCategory
  suppliers?: Supplier
}

export interface StockMovement {
  id: string
  product_id: string
  tipo: 'entrada' | 'salida' | 'ajuste'
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  razon: string
  referencia_id?: string
  referencia_tipo?: string
  usuario_id?: string
  created_at: string
}

export interface Sale {
  id: string
  numero_venta: string
  tipo: 'reparacion' | 'directa'
  repair_order_id?: string
  customer_id?: string
  subtotal: number
  iva: number
  ppm: number
  total: number
  metodo_pago: PaymentMethod
  comision_bancaria: number
  tipo_documento: DocumentType
  rut_receptor?: string
  razon_social_receptor?: string
  usuario_id?: string
  anulada: boolean
  notas?: string
  created_at: string
  customers?: Customer
  sale_items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id?: string
  nombre: string
  cantidad: number
  precio_unitario: number
  precio_costo: number
  subtotal: number
}

export interface TechnicianCommission {
  id: string
  repair_order_id: string
  tecnico_id: string
  precio_servicio: number
  costo_repuestos: number
  base_calculo: number
  porcentaje_base: number
  porcentaje_tipo: number
  descuento_metodo_pago: number
  comision_bruta: number
  comision_neta: number
  pagada: boolean
  fecha_pago?: string
  created_at: string
  repair_orders?: RepairOrder
}

export interface PurchaseOrder {
  id: string
  numero_oc: string
  supplier_id: string
  estado: 'pendiente' | 'en_transito' | 'recibida_parcial' | 'recibida_completa' | 'cancelada'
  metodo_pago?: PaymentMethod
  costo_envio_total: number
  total: number
  fecha_estimada_llegada?: string
  fecha_recepcion?: string
  notas?: string
  usuario_id?: string
  created_at: string
  updated_at: string
  suppliers?: Supplier
  purchase_order_items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id?: string
  nombre: string
  cantidad_solicitada: number
  cantidad_recibida: number
  precio_unitario: number
  costo_envio_prorrateado: number
  subtotal: number
}

export interface CashClosing {
  id: string
  fecha: string
  total_efectivo: number
  total_transferencia: number
  total_debito: number
  total_credito: number
  total_ventas: number
  total_iva: number
  total_ppm: number
  total_neto: number
  cantidad_transacciones: number
  usuario_id?: string
  notas?: string
  created_at: string
}
