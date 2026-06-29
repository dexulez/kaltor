import ClienteForm from '@/components/clientes/ClienteForm'
import BotonVolver from '@/components/shared/BotonVolver'

export default async function NuevoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  const backUrl = returnTo ?? '/clientes'

  return (
    <div className="p-6 space-y-5">
      <div>
        <BotonVolver label="← Volver" />
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nuevo cliente</h1>
        {returnTo && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2 inline-block">
            ↩ Al guardar volverás a donde estabas
          </p>
        )}
      </div>
      <div className="bg-white rounded-xl border p-6">
        <ClienteForm returnTo={returnTo} />
      </div>
    </div>
  )
}
