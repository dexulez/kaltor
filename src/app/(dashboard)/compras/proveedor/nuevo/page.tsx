import ProveedorForm from '@/components/compras/ProveedorForm'
import Link from 'next/link'

export default function NuevoProveedorPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/compras" className="text-sm text-blue-600 hover:underline">← Volver</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nuevo proveedor</h1>
      </div>
      <ProveedorForm />
    </div>
  )
}
