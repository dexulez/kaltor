import { createClient } from '@/lib/supabase/server'
import ConfiguracionForm from '@/components/shared/ConfiguracionForm'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('system_config').select('*').single()

  const config = data ?? {
    id: '',
    nombre_local: 'TechRepair Pro',
    rut_local: '',
    direccion: '',
    telefono: '',
    email: '',
    whatsapp: '',
    iva: 19,
    ppm: 3,
    comision_debito: 0,
    comision_credito: 0,
    comision_transferencia: 0,
    dias_garantia_default: 30,
    moneda: 'CLP',
    mostrar_precio_en_presupuesto: true,
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">⚙️</span>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      </div>

      <ConfiguracionForm config={config} />
    </div>
  )
}
