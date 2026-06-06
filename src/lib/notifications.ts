import { createClient } from '@/lib/supabase/client'

export type TipoNotificacion =
  | 'envio_proveedor'
  | 'solicitud_compra'
  | 'mercancia_recibida'
  | 'ot_listo'
  | 'ot_entregada'
  | 'stock_bajo'
  | 'nuevo_abono'
  | 'sistema'

export const NOTIF_ICONS: Record<TipoNotificacion, string> = {
  envio_proveedor:   '🚚',
  solicitud_compra:  '🛒',
  mercancia_recibida:'📦',
  ot_listo:          '✅',
  ot_entregada:      '🎉',
  stock_bajo:        '⚠️',
  nuevo_abono:       '💰',
  sistema:           '🔔',
}

export const NOTIF_COLORS: Record<TipoNotificacion, string> = {
  envio_proveedor:   'bg-blue-100 text-blue-700',
  solicitud_compra:  'bg-orange-100 text-orange-700',
  mercancia_recibida:'bg-green-100 text-green-700',
  ot_listo:          'bg-emerald-100 text-emerald-700',
  ot_entregada:      'bg-purple-100 text-purple-700',
  stock_bajo:        'bg-red-100 text-red-700',
  nuevo_abono:       'bg-yellow-100 text-yellow-700',
  sistema:           'bg-gray-100 text-gray-700',
}

export async function crearNotificacion({
  tipo, titulo, mensaje, url, usuario_id, metadata,
}: {
  tipo: TipoNotificacion
  titulo: string
  mensaje?: string
  url?: string
  usuario_id?: string | null
  metadata?: Record<string, unknown>
}) {
  const supabase = createClient()
  await supabase.from('notifications').insert({
    tipo,
    titulo,
    mensaje: mensaje ?? null,
    url: url ?? null,
    usuario_id: usuario_id ?? null,
    metadata: metadata ?? {},
  })
}
