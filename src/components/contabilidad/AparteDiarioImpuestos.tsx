import { formatCLP } from '@/lib/calculations'

interface Props {
  ventaAcumulada: number
  impuestoAcumulado: number
  diasTranscurridos: number
  diasEnMes: number
  esMesActual: boolean
}

export default function AparteDiarioImpuestos({ ventaAcumulada, impuestoAcumulado, diasTranscurridos, diasEnMes, esMesActual }: Props) {
  if (!esMesActual) return null

  const promedioDiario = diasTranscurridos > 0 ? Math.round(impuestoAcumulado / diasTranscurridos) : 0
  const promedioSemanal = promedioDiario * 7
  const proyeccionMensual = promedioDiario * diasEnMes
  const pct = ventaAcumulada > 0 ? (impuestoAcumulado / ventaAcumulada) * 100 : 0

  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <div>
        <h2 className="font-semibold text-gray-800">💰 Cuánto apartar para no tocarlo</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Eres recaudador del impuesto, no el dueño de esa plata. Según lo que llevas vendido este mes (día {diasTranscurridos} de {diasEnMes}):
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Generado hasta hoy</p>
          <p className="font-bold text-purple-700">{formatCLP(impuestoAcumulado)}</p>
          <p className="text-xs text-gray-400">IVA + PPM acumulado</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Apartar por día</p>
          <p className="font-bold text-purple-700">{formatCLP(promedioDiario)}</p>
          <p className="text-xs text-gray-400">promedio diario</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Apartar por semana</p>
          <p className="font-bold text-purple-700">{formatCLP(promedioSemanal)}</p>
          <p className="text-xs text-gray-400">~7 días</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Proyección del mes</p>
          <p className="font-bold text-purple-700">{formatCLP(proyeccionMensual)}</p>
          <p className="text-xs text-gray-400">si sigues a este ritmo</p>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        O más simple: aparta el <strong>{pct.toFixed(1)}%</strong> de cada venta apenas la cobres (en otra cuenta o una caja separada).
        Esa plata no es tuya: es el impuesto que ya le cobraste al cliente dentro del precio — apártala para no quedarte corto al pagar el F29.
      </p>
    </div>
  )
}
