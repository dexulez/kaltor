import { createClient } from '@/lib/supabase/server'
import { tieneAccesoModulo } from '@/lib/modulos'
import CatalogoB2BCarrito from '@/components/catalogo-b2b/CatalogoB2BCarrito'

type RolesRel = { nombre?: string } | { nombre?: string }[] | null | undefined

export default async function CatalogoB2BPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()

  const rolesRel = profile?.roles as RolesRel
  const rol = (Array.isArray(rolesRel) ? rolesRel[0]?.nombre : rolesRel?.nombre) ?? ''
  const permisos = profile?.permisos_modulos as Record<string, boolean> | null

  if (!tieneAccesoModulo('catalogo_b2b', rol, permisos)) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          No tienes acceso al catálogo B2B.
        </div>
      </div>
    )
  }

  // Solo columnas seguras: nunca exponer precio_costo al comprador externo.
  const { data: productos } = await supabase
    .from('products')
    .select('id, nombre, descripcion, sku, precio_mayorista, stock_actual, categoria_id, product_categories(nombre)')
    .eq('visible_compradores', true)
    .eq('activo', true)
    .order('nombre')

  type ProductoCatalogo = {
    id: string; nombre: string; descripcion: string | null; sku: string | null
    precio_mayorista: number | null; stock_actual: number; categoria_id: string
    product_categories: { nombre: string } | { nombre: string }[] | null
  }

  const lista = ((productos ?? []) as ProductoCatalogo[]).map(p => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    sku: p.sku,
    precio: p.precio_mayorista ?? 0,
    stock: p.stock_actual,
    categoria: Array.isArray(p.product_categories) ? p.product_categories[0]?.nombre : p.product_categories?.nombre ?? null,
  }))

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🛍️</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-sm text-gray-500">Arma tu pedido y envíalo para confirmación.</p>
        </div>
      </div>
      <CatalogoB2BCarrito productos={lista} />
    </div>
  )
}
