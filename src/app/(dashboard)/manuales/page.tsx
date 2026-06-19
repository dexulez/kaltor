import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'
import BuscadorManuales from '@/components/manuales/BuscadorManuales'

export const TIPO_INFO: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  falla_comun:  { label: 'Fallas comunes', color: 'bg-red-100 text-red-700',      icon: '⚠️', desc: 'Diagnósticos y soluciones' },
  plano:        { label: 'Planos',          color: 'bg-blue-100 text-blue-700',    icon: '📐', desc: 'Esquemáticos y diagramas' },
  test_point:   { label: 'Test Points',     color: 'bg-purple-100 text-purple-700',icon: '🔬', desc: 'Puntos de prueba en placa' },
  frp:          { label: 'FRP / Bypass',    color: 'bg-orange-100 text-orange-700',icon: '🔓', desc: 'Herramientas y procedimientos' },
  herramienta:  { label: 'Herramientas',    color: 'bg-green-100 text-green-700',  icon: '🛠️', desc: 'Software y equipos' },
  otro:         { label: 'Otros',           color: 'bg-gray-100 text-gray-600',    icon: '📄', desc: 'Otra información técnica' },
}

export default async function ManualesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; marca?: string }>
}) {
  const { q, tipo, marca } = await searchParams
  const supabase = await createClient()

  // Conteos por tipo
  const { data: todos } = await supabase
    .from('equipment_manuals')
    .select('id, tipo')

  const porTipo: Record<string, number> = {}
  ;(todos ?? []).forEach(r => { porTipo[r.tipo] = (porTipo[r.tipo] ?? 0) + 1 })
  const totalGeneral = todos?.length ?? 0

  // Entradas filtradas
  let query = supabase
    .from('equipment_manuals')
    .select('id, marca, modelo, tipo, titulo, tags, created_at')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (q)     query = query.or(`titulo.ilike.%${q}%,marca.ilike.%${q}%,modelo.ilike.%${q}%,contenido.ilike.%${q}%`)
  if (tipo)  query = query.eq('tipo', tipo)
  if (marca) query = query.ilike('marca', marca)

  const { data: manuales } = await query

  const tipoActivo = tipo ?? 'todos'

  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧠 Base de conocimiento</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manuales, fallas, planos y test points por equipo</p>
        </div>
        <div className="flex gap-2">
          <Link href="/manuales/ifixit">
            <Button variant="outline">🌐 Buscar en iFixit</Button>
          </Link>
          <Link href="/manuales/nuevo">
            <Button className="bg-blue-600 hover:bg-blue-700">+ Nueva entrada</Button>
          </Link>
        </div>
      </div>

      {/* Tabs de tipo — navegación principal del módulo */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide">
          {/* Tab "Todos" */}
          <Link
            href={`/manuales${q ? `?q=${encodeURIComponent(q)}` : ''}`}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${tipoActivo === 'todos'
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
          >
            <span>📋</span>
            <span>Todos</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${tipoActivo === 'todos' ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
              {totalGeneral}
            </span>
          </Link>

          {/* Tabs por tipo */}
          {Object.entries(TIPO_INFO).map(([key, info]) => {
            const count = porTipo[key] ?? 0
            const isActive = tipoActivo === key
            return (
              <Link
                key={key}
                href={`/manuales?tipo=${key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${isActive
                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
                {count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Buscador + descripción del tipo activo */}
      <div className="flex items-center gap-3 flex-wrap">
        <Suspense>
          <BuscadorManuales defaultQ={q} />
        </Suspense>
        {tipo && TIPO_INFO[tipo] && (
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{TIPO_INFO[tipo].icon} {TIPO_INFO[tipo].label}</span>
            {' '}— {TIPO_INFO[tipo].desc}
          </p>
        )}
      </div>

      {/* Contenido */}
      {!manuales?.length ? (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400 space-y-3">
          <span className="text-5xl block">
            {tipo ? TIPO_INFO[tipo]?.icon ?? '🧠' : '🧠'}
          </span>
          <p className="font-medium text-gray-600">
            {q ? `Sin resultados para "${q}"` : tipo ? `Sin entradas de tipo "${TIPO_INFO[tipo]?.label}"` : 'Sin entradas todavía'}
          </p>
          <p className="text-sm">Comienza agregando la primera entrada</p>
          <Link href={`/manuales/nuevo${tipo ? `?tipo=${tipo}` : ''}`}>
            <Button className="bg-blue-600 hover:bg-blue-700 mt-2">
              + {tipo ? `Agregar ${TIPO_INFO[tipo]?.label}` : 'Agregar primera entrada'}
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">{manuales.length} entrada(s)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {manuales.map(m => {
              const info = TIPO_INFO[m.tipo] ?? TIPO_INFO.otro
              return (
                <Link key={m.id} href={`/manuales/${m.id}`}>
                  <div className="bg-white rounded-xl border p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${info.color}`}>
                        {info.icon} {info.label}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(m.created_at).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 leading-tight flex-1">{m.titulo}</p>
                    <p className="text-sm text-blue-600 mt-1.5 font-medium">
                      {m.marca}{m.modelo ? ` · ${m.modelo}` : ''}
                    </p>
                    {m.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(m.tags as string[]).slice(0, 4).map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
