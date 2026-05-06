import { createClient } from '@/lib/supabase/client'

export type ModuloAudit =
  | 'caja' | 'reparaciones' | 'inventario' | 'compras'
  | 'clientes' | 'usuarios' | 'configuracion'

export type AccionAudit =
  | 'venta_creada' | 'venta_anulada'
  | 'ot_estado_cambio' | 'ot_pagada' | 'ot_creada'
  | 'precio_modificado' | 'stock_ajustado'
  | 'usuario_modificado' | 'rol_cambiado'
  | 'config_modificada'
  | 'producto_creado' | 'producto_modificado'

interface AuditPayload {
  accion: AccionAudit | string
  modulo: ModuloAudit | string
  entidad_id?: string
  entidad_desc?: string
  valor_anterior?: Record<string, unknown>
  valor_nuevo?: Record<string, unknown>
}

export async function logAudit(
  usuario_id: string,
  usuario_nombre: string,
  payload: AuditPayload
) {
  const supabase = createClient()
  // Fire and forget — no await bloqueante para no afectar UX
  supabase.from('audit_logs').insert({
    usuario_id,
    usuario_nombre,
    accion: payload.accion,
    modulo: payload.modulo,
    entidad_id: payload.entidad_id ?? null,
    entidad_desc: payload.entidad_desc ?? null,
    valor_anterior: payload.valor_anterior ?? null,
    valor_nuevo: payload.valor_nuevo ?? null,
    metadata: {},
  }).then(() => {})  // Ignorar errores de auditoría para no afectar el flujo principal
}
