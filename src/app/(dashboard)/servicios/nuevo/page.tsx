import Link from 'next/link'
import ServicioForm from '@/components/servicios/ServicioForm'

export default async function NuevoServicioPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href={returnTo ?? '/servicios'} className="text-sm text-blue-600 hover:underline">← Volver</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nuevo servicio</h1>
        <p className="text-gray-500 text-sm">Define un servicio con sus repuestos asociados y precio</p>
        {returnTo && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 inline-block">
            ↩ Al guardar volverás a donde estabas
          </p>
        )}
      </div>
      <ServicioForm returnTo={returnTo} />
    </div>
  )
}
