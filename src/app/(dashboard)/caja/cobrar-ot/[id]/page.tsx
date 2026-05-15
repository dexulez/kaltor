import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CobrarOTForm from '@/components/caja/CobrarOTForm'

const TZ = 'America/Santiago'

export default async function CobrarOTPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())

  const [{ data: ot }, { data: config }, { data: sesion }] = await Promise.all([
    supabase.from('repair_orders')
      .select('*, customers(*), equipment(*), repair_items(*), user_profiles(nombre_completo)')
      .eq('id', id)
      .single(),
    supabase.from('system_config').select('*').single(),
    supabase.from('sesiones_caja')
      .select('id, estado, apertura_at')
      .eq('fecha', hoy)
      .eq('estado', 'abierta')
      .maybeSingle()
      .then(r => r.error ? { data: null } : r),
  ])

  if (!ot) notFound()

  const cajaAbierta = !!sesion

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/caja" className="text-sm text-blue-600 hover:underline">← Volver a Caja</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Cobrar reparación — <span className="font-mono text-blue-700">{(ot as { numero_ot: string }).numero_ot}</span>
        </h1>
      </div>

      {/* Bloqueo si la caja está cerrada */}
      {!cajaAbierta && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
          <span className="text-5xl">🔒</span>
          <div>
            <p className="text-lg font-bold text-amber-900">La caja está cerrada</p>
            <p className="text-sm text-amber-700 mt-1">
              Debes abrir la caja antes de procesar un cobro.
            </p>
          </div>
          <Link href="/caja">
            <button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
              🔓 Ir a abrir la caja
            </button>
          </Link>
        </div>
      )}

      {/* Formulario solo si la caja está abierta */}
      {cajaAbierta && (
        <CobrarOTForm
          ot={ot as Parameters<typeof CobrarOTForm>[0]['ot']}
          config={{
            iva: config?.iva ?? 19,
            ppm: config?.ppm ?? 3,
            comision_debito: config?.comision_debito ?? 0,
            comision_credito: config?.comision_credito ?? 0,
            nombre_local: config?.nombre_local ?? 'TechRepair Pro',
            rut_local: config?.rut_local ?? null,
            direccion: config?.direccion ?? null,
            telefono: config?.telefono ?? null,
            email: config?.email ?? null,
            logo_url: config?.logo_url ?? null,
            terminos_condiciones: config?.terminos_condiciones ?? null,
          }}
        />
      )}
    </div>
  )
}
