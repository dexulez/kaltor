import Link from 'next/link'
import { buscarGuiasIFixit } from '@/lib/ifixit'

export default async function BuscarIFixitPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; marca?: string; modelo?: string }>
}) {
  const { q, marca, modelo } = await searchParams
  const consulta = (q ?? [marca, modelo].filter(Boolean).join(' ')).trim()

  let resultados: Awaited<ReturnType<typeof buscarGuiasIFixit>> = []
  let error: string | null = null
  if (consulta) {
    try {
      resultados = await buscarGuiasIFixit(consulta)
    } catch {
      error = 'No se pudo conectar con iFixit. Intenta de nuevo en unos minutos.'
    }
  }

  const paramsImportar = (guideid: number, url: string) => {
    const p = new URLSearchParams({ guideid: String(guideid), url })
    if (marca) p.set('marca', marca)
    if (modelo) p.set('modelo', modelo)
    return p.toString()
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/manuales" className="text-sm text-blue-600 hover:underline">← Volver a manuales</Link>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-3xl">🌐</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buscar en iFixit</h1>
            <p className="text-gray-500 text-sm">Guías de reparación externas — impórtalas a tu base de conocimiento.</p>
          </div>
        </div>
      </div>

      <form action="/manuales/ifixit" method="GET" className="flex gap-2 flex-wrap">
        <input
          name="q"
          defaultValue={consulta}
          placeholder="Ej: iPhone 13 screen, Samsung A52 battery..."
          className="flex-1 min-w-[240px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
          Buscar
        </button>
      </form>
      <p className="text-xs text-gray-400">La mayoría del contenido de iFixit está en inglés, aunque el sitio se muestre en español. Prueba con términos en inglés si no hay resultados (ej: &quot;screen&quot;, &quot;battery&quot;, &quot;charging port&quot;).</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!error && consulta && resultados.length === 0 && (
        <div className="bg-white rounded-xl border text-center py-14 text-gray-400">
          <span className="text-4xl block mb-2">🔍</span>
          <p className="text-sm">Sin resultados para &quot;{consulta}&quot;</p>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resultados.map(g => (
            <div key={g.guideid} className="bg-white rounded-xl border overflow-hidden flex flex-col">
              {g.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.imagen} alt={g.titulo} className="w-full h-36 object-cover bg-gray-100" />
              ) : (
                <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-4xl">🔧</div>
              )}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{g.titulo}</p>
                <p className="text-xs text-gray-400">{[g.categoria, g.subject, g.dificultad].filter(Boolean).join(' · ')}</p>
                <div className="flex gap-2 mt-auto pt-2">
                  <a href={g.url.replace('www.ifixit.com', 'es.ifixit.com')} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center text-xs font-medium border rounded-lg px-2 py-1.5 text-gray-600 hover:bg-gray-50">
                    Ver en iFixit ↗
                  </a>
                  <Link href={`/manuales/nuevo?${paramsImportar(g.guideid, g.url)}`}
                    className="flex-1 text-center text-xs font-medium border border-blue-300 rounded-lg px-2 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100">
                    Importar →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
