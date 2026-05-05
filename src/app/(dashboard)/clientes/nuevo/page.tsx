import ClienteForm from '@/components/clientes/ClienteForm'
import Link from 'next/link'

export default function NuevoClientePage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/clientes" className="text-sm text-blue-600 hover:underline">← Volver a clientes</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nuevo cliente</h1>
      </div>
      <div className="bg-white rounded-xl border p-6">
        <ClienteForm />
      </div>
    </div>
  )
}
