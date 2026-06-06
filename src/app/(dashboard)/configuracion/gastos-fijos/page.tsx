import Link from 'next/link'
import GastosFijosManager from '@/components/configuracion/GastosFijosManager'

export default function GastosFijosPage() {
  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <Link href="/configuracion" className="text-sm text-blue-600 hover:underline">← Volver a Configuración</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Gastos Fijos del Local</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Registra todos los costos fijos mensuales — se usan en el análisis de Punto de Equilibrio del módulo de Informes.
        </p>
      </div>
      <GastosFijosManager />
    </div>
  )
}
