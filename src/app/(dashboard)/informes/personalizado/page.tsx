import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { tieneAccesoModulo } from '@/lib/modulos'
import ReportBuilder from '@/components/informes/ReportBuilder'

export default async function ReportePersonalizadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()

  const rolesRel = profile?.roles as { nombre?: string } | { nombre?: string }[] | null | undefined
  const rol = (Array.isArray(rolesRel) ? rolesRel[0]?.nombre : rolesRel?.nombre) ?? ''
  const permisos = profile?.permisos_modulos as Record<string, boolean> | null

  if (!tieneAccesoModulo('informes', rol, permisos)) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          No tienes acceso al módulo de Informes.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/informes" className="text-sm text-gray-500 hover:text-gray-800">← Informes</Link>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-3xl">🧩</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte a medida</h1>
          <p className="text-sm text-gray-500">Elige una fuente de datos, las columnas y los filtros para generar un reporte y exportarlo a Excel o PDF.</p>
        </div>
      </div>
      <ReportBuilder />
    </div>
  )
}
