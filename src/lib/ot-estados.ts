import type { RepairStatus } from '@/types'

// ── Paleta semántica de estados de OT ─────────────────────────────────────────
// 4 colores según categoría operativa, no uno por estado.
// Ref: Kaltor_Paleta_UI_Dashboard.md § 5
//
// Pendiente        → neutro   (gris)
// En proceso       → info     (azul  #3B82F6)
// Bloqueado        → warning  (ámbar #FFB020)
// Completado       → success  (verde #2FB673)
// Cerrado sin éxito→ error    (rojo  #F04438)

export const ESTADO_COLOR: Record<string, string> = {
  recibido:           'bg-gray-100 text-gray-600',
  en_diagnostico:     'bg-blue-100 text-blue-700',
  presupuestado:      'bg-blue-100 text-blue-700',
  aprobado:           'bg-blue-100 text-blue-700',
  esperando_repuesto: 'bg-amber-100 text-amber-700',
  en_reparacion:      'bg-blue-100 text-blue-700',
  listo:              'bg-green-100 text-green-700',
  para_entrega:       'bg-green-100 text-green-700',
  entregado:          'bg-green-100 text-green-700',
  en_garantia:        'bg-amber-100 text-amber-700',
  rechazado:          'bg-red-100 text-red-700',
  cancelado:          'bg-red-100 text-red-700',
}

export const ESTADO_LABEL: Record<string, string> = {
  recibido:           'Recibido',
  en_diagnostico:     'En diagnóstico',
  presupuestado:      'Presupuestado',
  aprobado:           'Aprobado',
  rechazado:          'Rechazado',
  esperando_repuesto: 'Esp. repuesto',
  en_reparacion:      'En reparación',
  listo:              'Listo ✓',
  para_entrega:       'Para entrega',
  entregado:          'Entregado',
  en_garantia:        'En garantía',
  cancelado:          'Cancelado',
}

export const ESTADO_LABEL_LARGO: Record<string, string> = {
  recibido:           'Recibido',
  en_diagnostico:     'En diagnóstico',
  presupuestado:      'Presupuestando',
  aprobado:           'Aceptado',
  rechazado:          'Rechazado',
  esperando_repuesto: 'Esperando repuesto',
  en_reparacion:      'En reparación',
  listo:              'Listo',
  para_entrega:       'Para entrega',
  entregado:          'Entregado',
  en_garantia:        'En garantía',
  cancelado:          'Cancelado',
}

// Para la página pública de seguimiento (label descriptivo + icono)
export const ESTADO_SEGUIMIENTO: Record<string, { label: string; color: string; bg: string; icono: string }> = {
  recibido:           { label: 'Recibido en taller',       color: 'text-gray-600',   bg: 'bg-gray-100',   icono: '📥' },
  en_diagnostico:     { label: 'En diagnóstico',           color: 'text-blue-700',   bg: 'bg-blue-100',   icono: '🔍' },
  presupuestado:      { label: 'Presupuesto en proceso',   color: 'text-blue-700',   bg: 'bg-blue-100',   icono: '📋' },
  aprobado:           { label: 'Presupuesto aprobado',     color: 'text-blue-700',   bg: 'bg-blue-100',   icono: '✅' },
  esperando_repuesto: { label: 'Esperando repuesto',       color: 'text-amber-700',  bg: 'bg-amber-100',  icono: '⏳' },
  en_reparacion:      { label: 'En reparación',            color: 'text-blue-700',   bg: 'bg-blue-100',   icono: '🔧' },
  listo:              { label: 'Listo para retirar',       color: 'text-green-700',  bg: 'bg-green-100',  icono: '✅' },
  para_entrega:       { label: 'Listo para retirar',       color: 'text-green-700',  bg: 'bg-green-100',  icono: '📦' },
  entregado:          { label: 'Entregado al cliente',     color: 'text-green-700',  bg: 'bg-green-100',  icono: '🎉' },
  en_garantia:        { label: 'En revisión de garantía',  color: 'text-amber-700',  bg: 'bg-amber-100',  icono: '🛡️' },
  rechazado:          { label: 'Presupuesto rechazado',    color: 'text-red-700',    bg: 'bg-red-100',    icono: '❌' },
  cancelado:          { label: 'Cancelado',                color: 'text-red-700',    bg: 'bg-red-100',    icono: '🚫' },
}
