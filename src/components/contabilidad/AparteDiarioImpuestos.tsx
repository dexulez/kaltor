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
  const pct = ventaAcumulada > 0 ? (impuestoAcumulado / ventaAcumulada) * 100 : 0

  return (
    <div className="bg-white rounded-xl border p-5 space-y-3">
      <div>
        <h2 className="font-semibold text-gray-800">💰 Cuánto apartar para no tocarlo</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Según lo que llevas vendido este mes (día {diasTranscurridos} de {diasEnMes})
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Impuesto generado hasta hoy</p>
          <p className="font-bold text-purple-700">{formatCLP(impuestoAcumulado)}</p>
          <p className="text-xs text-gray-400">IVA + PPM de tus ventas</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Promedio a apartar por día</p>
          <p className="font-bold text-purple-700">{formatCLP(promedioDiario)}</p>
          <p className="text-xs text-gray-400">desde el día 1 del mes</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">O aparta este % de cada venta</p>
          <p className="font-bold text-purple-700">{pct.toFixed(1)}%</p>
          <p className="text-xs text-gray-400">del total cobrado</p>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Esa plata no es tuya: es el impuesto que ya cobraste a tus clientes dentro del precio. Apártala apenas la recibas
        (en otra cuenta o una caja separada) para no quedarte corto al pagar el F29.
      </p>
    </div>
  )
}
