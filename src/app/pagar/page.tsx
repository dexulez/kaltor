import { createServiceClient } from '@/lib/supabase/server'
import CopiarCuenta from './CopiarCuenta'

const TIPO_LABEL: Record<string, string> = {
  corriente: 'Cta. Corriente', vista: 'Cta. Vista', ahorro: 'Cta. Ahorro',
  rut: 'Cta. RUT', digital: 'Cta. Digital',
}

export default async function PagarPage() {
  const supabase = createServiceClient()

  const [{ data: cuentas }, { data: config }] = await Promise.all([
    supabase.from('cuentas_bancarias')
      .select('id, banco, tipo_cuenta, numero, titular, rut_titular, email')
      .eq('activa', true).eq('es_publica', true).order('orden')
      .then(r => r.error ? { data: [] } : r),
    supabase.from('system_config')
      .select('nombre_local, telefono, whatsapp, logo_url').maybeSingle(),
  ])

  type Cuenta = { id: string; banco: string; tipo_cuenta: string; numero: string; titular: string; rut_titular: string | null; email: string | null }
  const lista = (cuentas ?? []) as Cuenta[]
  const cfg = config as { nombre_local?: string; telefono?: string; whatsapp?: string; logo_url?: string } | null

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {cfg?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.logo_url} alt="Logo" className="h-10 max-w-24 object-contain" />
          )}
          <div>
            <p className="font-bold text-gray-900">{cfg?.nombre_local ?? 'Servitec'}</p>
            <p className="text-xs text-gray-400">Datos para transferencias y depósitos</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-gray-800">🏦 Cuentas para pago</p>
          <p className="text-sm text-gray-500">Puedes transferir o depositar a cualquiera de las siguientes cuentas</p>
        </div>

        {lista.length === 0 ? (
          <div className="bg-white rounded-2xl border shadow-sm p-8 text-center">
            <p className="text-gray-400">No hay cuentas disponibles en este momento</p>
            {cfg?.telefono && (
              <p className="text-sm text-gray-500 mt-2">Contacta al taller: {cfg.telefono}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map(c => {
              const textoCopia = [
                `${c.banco} · ${TIPO_LABEL[c.tipo_cuenta] ?? c.tipo_cuenta}`,
                `N° ${c.numero}`,
                `Titular: ${c.titular}`,
                c.rut_titular ? `RUT: ${c.rut_titular}` : null,
                c.email ? `Email: ${c.email}` : null,
              ].filter(Boolean).join(' · ')

              return (
                <div key={c.id} className="bg-white rounded-2xl border shadow-sm p-5">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="font-bold text-gray-900 text-lg">{c.banco}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {TIPO_LABEL[c.tipo_cuenta] ?? c.tipo_cuenta}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[80px_1fr] gap-1 items-center">
                      <span className="text-xs text-gray-400">N° cuenta</span>
                      <span className="font-mono font-bold text-gray-800 text-base select-all">{c.numero}</span>
                    </div>
                    <div className="grid grid-cols-[80px_1fr] gap-1">
                      <span className="text-xs text-gray-400">Titular</span>
                      <span className="text-sm text-gray-700">{c.titular}</span>
                    </div>
                    {c.rut_titular && (
                      <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="text-xs text-gray-400">RUT</span>
                        <span className="text-sm text-gray-700">{c.rut_titular}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="text-xs text-gray-400">Email</span>
                        <span className="text-sm text-blue-600">{c.email}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <CopiarCuenta texto={textoCopia} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Contacto */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 text-center space-y-2">
          <p className="text-sm font-semibold text-gray-700">¿Necesitas ayuda?</p>
          <div className="flex justify-center gap-3 flex-wrap">
            {cfg?.telefono && (
              <a href={`tel:${cfg.telefono}`}
                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-xl font-medium">
                📞 {cfg.telefono}
              </a>
            )}
            {cfg?.whatsapp && (
              <a href={`https://wa.me/${cfg.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero hacer un pago')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl font-medium">
                📲 WhatsApp
              </a>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300">{cfg?.nombre_local}</p>
      </div>
    </div>
  )
}
