import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SolicitudAccesoB2BForm from '@/components/acceso-b2b/SolicitudAccesoB2BForm'

export default async function AccesoB2BPage() {
  const supabase = createServiceClient()
  const { data: cfg } = await supabase
    .from('system_config')
    .select('nombre_local, telefono, logo_url')
    .maybeSingle()

  const local = cfg as { nombre_local?: string; telefono?: string | null; logo_url?: string | null } | null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {local?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={local.logo_url} alt="Logo" className="h-10 max-w-24 object-contain" />
          )}
          <div>
            <p className="font-bold text-gray-900">{local?.nombre_local ?? 'Kaltor'}</p>
            {local?.telefono && <p className="text-xs text-gray-500">Tel: {local.telefono}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏪</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Canal mayorista (B2B)</h1>
              <p className="text-sm text-gray-500">Para talleres y negocios que compran al por mayor</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Si ya tienes una cuenta de comprador externo, inicia sesión para ver el catálogo y tus pedidos.
            Si todavía no eres cliente B2B, puedes solicitar acceso más abajo.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center justify-center w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 transition-colors"
          >
            Ya tengo cuenta — Iniciar sesión
          </Link>
        </div>

        <SolicitudAccesoB2BForm />
      </div>
    </div>
  )
}
