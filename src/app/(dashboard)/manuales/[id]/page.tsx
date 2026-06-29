import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BotonVolver from '@/components/shared/BotonVolver'
import { Button } from '@/components/ui/button'
import { TIPO_INFO } from '../page'
import ManualContenido from '@/components/manuales/ManualContenido'

export default async function ManualDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: manual }, { data: { user } }] = await Promise.all([
    supabase.from('equipment_manuals')
      .select('*, user_profiles(nombre_completo)')
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
  ])

  if (!manual) notFound()

  const tipo = TIPO_INFO[manual.tipo] ?? TIPO_INFO.otro
  const autor = (manual.user_profiles as { nombre_completo?: string } | null)?.nombre_completo

  // Buscar otras entradas del mismo equipo
  const { data: relacionadas } = await supabase
    .from('equipment_manuals')
    .select('id, tipo, titulo')
    .eq('marca', manual.marca)
    .eq('modelo', manual.modelo ?? '')
    .neq('id', id)
    .limit(6)

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <BotonVolver label="← Volver a manuales" />
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tipo.color}`}>
              {tipo.icon} {tipo.label}
            </span>
            <span className="text-sm text-blue-600 font-medium">
              {manual.marca}{manual.modelo ? ` · ${manual.modelo}` : ''}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{manual.titulo}</h1>
          <p className="text-xs text-gray-400 mt-1">
            {autor && `Por ${autor} · `}
            {new Date(manual.updated_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {user && (
          <Link href={`/manuales/${id}/editar`}>
            <Button variant="outline" size="sm">✏️ Editar</Button>
          </Link>
        )}
      </div>

      {/* Tags */}
      {manual.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {manual.tags.map((t: string) => (
            <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{t}</span>
          ))}
        </div>
      )}

      {/* Contenido Markdown */}
      {manual.contenido && (
        <div className="bg-white rounded-xl border p-6">
          <ManualContenido contenido={manual.contenido} />
        </div>
      )}

      {/* Archivos adjuntos */}
      {manual.archivos?.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-3">📎 Archivos adjuntos ({manual.archivos.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {manual.archivos.map((url: string, i: number) => {
              const isPdf = url.toLowerCase().includes('.pdf')
              const nombre = decodeURIComponent(url.split('/').pop() ?? `archivo-${i + 1}`)
              return isPdf ? (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <span className="text-2xl shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{nombre}</p>
                    <p className="text-xs text-blue-600">Abrir PDF</p>
                  </div>
                </a>
              ) : (
                <div key={url} className="space-y-1">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={nombre} className="w-full rounded-xl border object-cover max-h-64 hover:opacity-90 transition-opacity" />
                  </a>
                  <p className="text-xs text-gray-400 truncate">{nombre}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Entradas relacionadas del mismo equipo */}
      {(relacionadas?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-3">
            Otras entradas para {manual.marca}{manual.modelo ? ` ${manual.modelo}` : ''}
          </h2>
          <div className="space-y-2">
            {relacionadas!.map(r => {
              const t = TIPO_INFO[r.tipo] ?? TIPO_INFO.otro
              return (
                <Link key={r.id} href={`/manuales/${r.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 border">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${t.color}`}>{t.icon} {t.label}</span>
                  <span className="text-sm text-gray-800">{r.titulo}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
