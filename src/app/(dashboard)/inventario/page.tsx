import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCLP } from '@/lib/calculations'
import { Product, ProductCategory, Supplier } from '@/types'
import ProductoQRButton from '@/components/inventario/ProductoQRButton'
import EliminarProductoBtn from '@/components/inventario/EliminarProductoBtn'
import BuscadorInventario from '@/components/inventario/BuscadorInventario'
import ProductoB2BControl from '@/components/inventario/ProductoB2BControl'
import { Suspense } from 'react'
import { tieneSubPermiso } from '@/lib/modulos'

const TIPO_LABELS: Record<string, string> = {
  repuesto: 'Repuesto', accesorio: 'Accesorio',
  equipo_usado: 'Equipo usado', insumo: 'Insumo',
}
const TIPO_COLORS: Record<string, string> = {
  repuesto: 'bg-blue-100 text-blue-700', accesorio: 'bg-green-100 text-green-700',
  equipo_usado: 'bg-purple-100 text-purple-700', insumo: 'bg-gray-100 text-gray-600',
}

type ProductListItem = Product & {
  product_categories: Pick<ProductCategory, 'nombre' | 'tipo'> | null
  suppliers: Pick<Supplier, 'nombre'> | null
}

export default async function InventarioPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; categoria?: string; alerta?: string }> }) {
  const { q, categoria, alerta } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesData = perfil?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfil?.permisos_modulos as Record<string, boolean> | null
  const puedeEditar = tieneSubPermiso('inventario.editar', rolNombre, permisos)
  const puedeEliminar = tieneSubPermiso('inventario.eliminar', rolNombre, permisos)
  const puedeVerCostos = tieneSubPermiso('inventario.ver_costos', rolNombre, permisos)
  const puedeCargaMasiva = tieneSubPermiso('inventario.carga_masiva', rolNombre, permisos)
  const puedeCategorias = tieneSubPermiso('inventario.categorias', rolNombre, permisos)

  let query = supabase
    .from('products')
    .select('*, product_categories(nombre, tipo), suppliers(nombre)')
    .eq('activo', true)
    .order('nombre')

  if (q) query = query.or(`nombre.ilike.%${q}%,sku.ilike.%${q}%,codigo_barras.ilike.%${q}%`)
  if (categoria) query = query.eq('categoria_id', categoria)
  if (alerta === '1') query = query.filter('stock_actual', 'lte', 'stock_minimo')

  const [{ data: productos }, { data: categorias }, { count: alertaCount }] = await Promise.all([
    query.limit(100),
    supabase.from('product_categories').select('*').order('nombre'),
    supabase.from('products').select('*', { count: 'exact', head: true })
      .eq('activo', true).filter('stock_actual', 'lte', 'stock_minimo'),
  ])

  const productosList: ProductListItem[] = (productos ?? []) as ProductListItem[]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 text-sm mt-0.5">{productos?.length ?? 0} producto(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/inventario/movimientos">
            <Button variant="outline" className="gap-1.5">🔍 Movimientos</Button>
          </Link>
          <Link href="/inventario/ajuste">
            <Button variant="outline" className="gap-1.5 text-orange-700 border-orange-300 hover:bg-orange-50">📦 Ajuste stock</Button>
          </Link>
          <Link href="/inventario/toma">
            <Button variant="outline" className="gap-1.5">📋 Toma inventario</Button>
          </Link>
          {puedeCategorias && (
            <Link href="/inventario/categorias">
              <Button variant="outline" className="gap-1.5">🗂️ Categorías</Button>
            </Link>
          )}
          {puedeVerCostos && (
            <Link href="/inventario/precios">
              <Button variant="outline" className="gap-1.5">💰 Precios</Button>
            </Link>
          )}
          {puedeCargaMasiva && (
            <Link href="/inventario/carga-masiva">
              <Button variant="outline" className="gap-1.5">⬆️ Carga masiva</Button>
            </Link>
          )}
          {puedeEditar && (
            <Link href="/inventario/nuevo">
              <Button className="bg-blue-600 hover:bg-blue-700">+ Nuevo producto</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Alerta stock crítico */}
      {(alertaCount ?? 0) > 0 && (
        <Link href="/inventario?alerta=1">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-red-100 transition-colors">
            <span className="text-xl">⚠️</span>
            <p className="text-red-700 text-sm font-medium">
              {alertaCount} producto(s) con stock en nivel crítico — Click para ver
            </p>
          </div>
        </Link>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Suspense fallback={<input placeholder="Buscar..." className="border rounded-lg px-3 py-2 text-sm w-64" />}>
          <BuscadorInventario defaultValue={q} />
        </Suspense>
        <Link href="/inventario">
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border ${!categoria ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
            Todos
          </span>
        </Link>
        {categorias?.map(cat => (
          <Link key={cat.id} href={`/inventario?categoria=${cat.id}`}>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors
              ${categoria === cat.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
              {cat.nombre}
            </span>
          </Link>
        ))}
      </div>

      {!productos?.length ? (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">📦</span>
          <p className="font-medium">No hay productos registrados</p>
          <p className="text-sm mt-1">Agrega productos con &quot;+ Nuevo producto&quot;</p>
        </div>
      ) : (
        <>
          {/* ── Móvil: tarjetas ────────────────────────────────────────── */}
          <div className="md:hidden space-y-2">
            {productosList.map((p) => {
              const critico = p.stock_actual <= p.stock_minimo
              const tipo = p.product_categories?.tipo ?? ''
              return (
                <div key={p.id} className={`bg-white rounded-xl border px-4 py-3 ${critico ? 'border-red-300 bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      {p.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.foto_url} alt={p.nombre} className="w-10 h-10 rounded-lg border object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg border bg-gray-50 flex items-center justify-center text-base text-gray-300 shrink-0">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{p.nombre}</p>
                        {p.sku && <p className="text-xs text-gray-400 mt-0.5">{p.sku}</p>}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${TIPO_COLORS[tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TIPO_LABELS[tipo] ?? tipo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`font-bold ${critico ? 'text-red-600' : 'text-gray-700'}`}>
                        Stock: {p.stock_actual}
                        <span className="text-gray-400 font-normal"> / mín {p.stock_minimo}</span>
                      </span>
                      <span className="text-green-700 font-semibold">{formatCLP(p.precio_venta)}</span>
                    </div>
                    <div className="flex gap-1">
                      <ProductoQRButton productId={p.id} nombre={p.nombre} sku={p.sku} />
                      {puedeEditar && (
                        <Link href={`/inventario/${p.id}/editar`}>
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2">Editar</Button>
                        </Link>
                      )}
                      {puedeEliminar && <EliminarProductoBtn productId={p.id} nombre={p.nombre} />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">Catálogo B2B</span>
                    <ProductoB2BControl
                      productId={p.id}
                      nombre={p.nombre}
                      precioMayorista={p.precio_mayorista ?? null}
                      visibleCompradores={p.visible_compradores ?? false}
                      disabled={!puedeEditar}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Desktop: tabla ─────────────────────────────────────────── */}
          <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                  {puedeVerCostos && <th className="text-right px-4 py-3 font-medium text-gray-600">Costo real</th>}
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Precio venta</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Mayorista / B2B</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productosList.map((p) => {
                  const critico = p.stock_actual <= p.stock_minimo
                  const costoReal = (p.precio_costo ?? 0) + (p.costo_envio ?? 0)
                  const tipo = p.product_categories?.tipo ?? ''
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 ${critico ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {p.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.foto_url} alt={p.nombre} className="w-9 h-9 rounded-lg border object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg border bg-gray-50 flex items-center justify-center text-sm text-gray-300 shrink-0">📦</div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{p.nombre}</p>
                            {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                          {TIPO_LABELS[tipo] ?? tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.suppliers?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${critico ? 'text-red-600' : 'text-gray-800'}`}>{p.stock_actual}</span>
                        <span className="text-gray-400 text-xs"> / mín {p.stock_minimo}</span>
                      </td>
                      {puedeVerCostos && <td className="px-4 py-3 text-right text-gray-600">{formatCLP(costoReal)}</td>}
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCLP(p.precio_venta)}</td>
                      <td className="px-4 py-3">
                        <ProductoB2BControl
                          productId={p.id}
                          nombre={p.nombre}
                          precioMayorista={p.precio_mayorista ?? null}
                          visibleCompradores={p.visible_compradores ?? false}
                          disabled={!puedeEditar}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <ProductoQRButton productId={p.id} nombre={p.nombre} sku={p.sku} />
                          {puedeEditar && (
                            <Link href={`/inventario/${p.id}/editar`}>
                              <Button variant="outline" size="sm">Editar</Button>
                            </Link>
                          )}
                          {puedeEliminar && <EliminarProductoBtn productId={p.id} nombre={p.nombre} />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
