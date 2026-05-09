import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'
import BuscadorManuales from '@/components/manuales/BuscadorManuales'

export const TIPO_INFO: Record<string, { label: string; color: string; icon: string }> = {
  falla_comun:  { label: 'Falla común',   color: 'bg-red-100 text-red-700',    icon: '⚠️' },
  plano:        { label: 'Plano/Esquema', color: 'bg-blue-100 text-blue-700',  icon: '📐' },
  test_point:   { label: 'Test Point',    color: 'bg-purple-100 text-purple-700', icon: '🔬' },
  frp:          { label: 'FRP / Bypass',  color: 'bg-orange-100 text-orange-700', icon: '🔓' },
  herramienta:  { label: 'Herramienta',   color: 'bg-green-100 text-green-700', icon: '🛠️' },
  otro:         { label: 'Otro',          color: 'bg-gray-100 text-gray-600',  icon: '📄' },
}

export default async function ManualesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; marca?: string }>
}) {
  const { q, tipo, marca } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('equipment_manuals')
    .select('id, marca, modelo, tipo, titulo, tags, created_at')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (q)     query = query.or(`titulo.ilike.%${q}%,marca.ilike.%${q}%,modelo.ilike.%${q}%,contenido.ilike.%${q}%`)
  if (tipo)  query = query.eq('tipo', tipo)
  if (marca) query = query.ilike('marca', marca)

  const { data: manuales } = await query

  // Conteos por tipo para filtros rápidos
  const { data: conteos } = await supabase
    .from('equipment_manuals')
    .select('tipo')

  const porTipo: Record<string, number> = {}
  ;(conteos ?? []).forEach(r => { porTipo[r.tipo] = (porTipo[r.tipo] ?? 0) + 1 })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧠 Base de conocimiento</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manuales, fallas comunes, planos y test points</p>
        </div>
        <Link href="/manuales/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">+ Nueva entrada</Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Suspense>
          <BuscadorManuales defaultQ={q} />
        </Suspense>

        <Link href="/manuales">
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${!tipo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
            Todos ({conteos?.length ?? 0})
          </span>
        </Link>
        {Object.entries(TIPO_INFO).map(([key, info]) => {
          const count = porTipo[key] ?? 0
          if (count === 0) return null
          return (
            <Link key={key} href={`/manuales?tipo=${key}${marca ? `&marca=${marca}` : ''}`}>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${tipo === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                {info.icon} {info.label} ({count})
              </span>
            </Link>
          )
        })}
      </div>

      {/* Lista */}
      {!manuales?.length ? (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">🧠</span>
          <p className="font-medium text-gray-600">Sin entradas todavía</p>
          <p className="text-sm mt-1">Comienza agregando fallas comunes, planos o test points</p>
          <Link href="/manuales/nuevo" className="mt-4 inline-block">
            <Button className="bg-blue-600 hover:bg-blue-700 mt-3">+ Agregar primera entrada</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {manuales.map(m => {
            const info = TIPO_INFO[m.tipo] ?? TIPO_INFO.otro
            return (
              <Link key={m.id} href={`/manuales/${m.id}`}>
                <div className="bg-white rounded-xl border p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${info.color}`}>
                      {info.icon} {info.label}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(m.created_at).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 leading-tight">{m.titulo}</p>
                  <p className="text-sm text-blue-600 mt-1 font-medium">
                    {m.marca}{m.modelo ? ` · ${m.modelo}` : ''}
                  </p>
                  {m.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.tags.slice(0, 4).map((t: string) => (
                        <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
