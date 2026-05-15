import { createClient } from '@/lib/supabase/server'
import ConfiguracionForm from '@/components/shared/ConfiguracionForm'
import Link from 'next/link'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('system_config').select('*').single()

  const config = data ?? {
    id: '',
    nombre_local: 'TechRepair Pro',
    rut_local: null,
    direccion: null,
    telefono: null,
    email: null,
    whatsapp: null,
    logo_url: null,
    iva: 19,
    ppm: 3,
    comision_debito: 0,
    comision_credito: 0,
    comision_transferencia: 0,
    dias_garantia_default: 30,
    moneda: 'CLP',
    mostrar_precio_en_presupuesto: true,
    terminos_condiciones: null,
    costo_insumos_promedio: 0,
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">⚙️</span>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      </div>
      <ConfiguracionForm config={config} />

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/configuracion/cuentas"
          className="flex items-center gap-3 bg-white rounded-xl border p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors">
          <span className="text-2xl">🏦</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Cuentas bancarias</p>
            <p className="text-xs text-gray-400">Gestiona las cuentas para pagos de clientes</p>
          </div>
          <span className="ml-auto text-gray-300">→</span>
        </Link>
        <Link href="/pagar" target="_blank"
          className="flex items-center gap-3 bg-white rounded-xl border p-4 hover:border-green-400 hover:bg-green-50 transition-colors">
          <span className="text-2xl">🔗</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Enlace de pagos</p>
            <p className="text-xs text-gray-400">Página pública para compartir con clientes</p>
          </div>
          <span className="ml-auto text-gray-300">→</span>
        </Link>
      </div>
    </div>
  )
}
