import Link from 'next/link'
import ManualForm from '@/components/manuales/ManualForm'

export default function NuevoManualPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/manuales" className="text-sm text-blue-600 hover:underline">← Volver a manuales</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nueva entrada</h1>
        <p className="text-gray-500 text-sm">Agrega una falla, plano, test point u otro conocimiento técnico</p>
      </div>
      <ManualForm />
    </div>
  )
}
