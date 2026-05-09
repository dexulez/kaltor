import Link from 'next/link'
import ServicioForm from '@/components/servicios/ServicioForm'

export default function NuevoServicioPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/servicios" className="text-sm text-blue-600 hover:underline">← Volver a servicios</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nuevo servicio</h1>
        <p className="text-gray-500 text-sm">Define un servicio con sus repuestos asociados y precio</p>
      </div>
      <ServicioForm />
    </div>
  )
}
