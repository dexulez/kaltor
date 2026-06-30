import { createClient } from '@/lib/supabase/server'
import { tieneAccesoModulo, tieneSubPermiso } from '@/lib/modulos'
import CatalogoB2BCarrito from '@/components/catalogo-b2b/CatalogoB2BCarrito'
import CatalogoB2BAdmin from '@/components/catalogo-b2b/CatalogoB2BAdmin'
import GenerarListaPreciosBtn from '@/components/catalogo-b2b/GenerarListaPreciosBtn'

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

  const esStaff = rol !== 'comprador_externo'

  if (esStaff) {
    // Vista interna: todo el inventario activo, para elegir qué se publica en el catálogo B2B.
    const puedeEditar = tieneSubPermiso('inventario.editar', rol, permisos)
    const [{ data: productos }, { data: cfg }] = await Promise.all([
      supabase.from('products')
        .select(`
          id, nombre, sku, precio_mayorista, stock_actual, visible_compradores, categoria_id, product_categories(nombre),
          mayorista_descuento_tipo, mayorista_descuento_valor, mayorista_descuento_desde_cantidad
        `)
        .eq('activo', true)
        .order('nombre'),
      supabase.from('system_config').select('nombre_local, rut_local, direccion, telefono, logo_url, iva').maybeSingle(),
    ])

    type ProductoInventario = {
      id: string; nombre: string; sku: string | null
      precio_mayorista: number | null; stock_actual: number; visible_compradores: boolean | null; categoria_id: string
      product_categories: { nombre: string } | { nombre: string }[] | null
      mayorista_descuento_tipo: 'porcentaje' | 'monto' | null
      mayorista_descuento_valor: number | null
      mayorista_descuento_desde_cantidad: number | null
    }

    const productosRaw = (productos ?? []) as ProductoInventario[]
    const categoriaNombre = (p: ProductoInventario) =>
      Array.isArray(p.product_categories) ? p.product_categories[0]?.nombre : p.product_categories?.nombre ?? null

    const lista = productosRaw.map(p => ({
      id: p.id,
      nombre: p.nombre,
      sku: p.sku,
      precioMayorista: p.precio_mayorista,
      stock: p.stock_actual,
      visible: p.visible_compradores ?? false,
      categoria: categoriaNombre(p),
    }))

    const productosListaPrecios = productosRaw
      .filter(p => p.visible_compradores && (p.precio_mayorista ?? 0) > 0)
      .map(p => ({
        nombre: p.nombre,
        sku: p.sku,
        categoria: categoriaNombre(p),
        precio: p.precio_mayorista ?? 0,
        descuentoTipo: p.mayorista_descuento_tipo,
        descuentoValor: p.mayorista_descuento_valor,
        descuentoDesdeCantidad: p.mayorista_descuento_desde_cantidad,
      }))

    const local = cfg as { nombre_local?: string; rut_local?: string | null; direccion?: string | null; telefono?: string | null; logo_url?: string | null; iva?: number | null } | null

    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛍️</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catálogo B2B</h1>
              <p className="text-sm text-gray-500">Activa o desactiva qué productos del inventario ven los compradores externos.</p>
            </div>
          </div>
          <GenerarListaPreciosBtn
            productos={productosListaPrecios}
            empresa={{
              nombreLocal: local?.nombre_local ?? 'TechRepair Pro',
              rut: local?.rut_local,
              direccion: local?.direccion,
              telefono: local?.telefono,
              logoUrl: local?.logo_url,
            }}
            ivaPct={local?.iva ?? 19}
          />
        </div>
        <CatalogoB2BAdmin productos={lista} puedeEditar={puedeEditar} />
      </div>
    )
  }

  // Vista comprador: solo columnas seguras (nunca exponer precio_costo) y solo lo publicado.
  const [{ data: productos }, { data: cfgComprador }] = await Promise.all([
    supabase
      .from('products')
      .select('id, nombre, descripcion, sku, precio_mayorista, stock_actual, categoria_id, product_categories(nombre), mayorista_descuento_tipo, mayorista_descuento_valor, mayorista_descuento_desde_cantidad')
      .eq('visible_compradores', true)
      .eq('activo', true)
      .order('nombre'),
    supabase.from('system_config').select('iva').maybeSingle(),
  ])

  type ProductoCatalogo = {
    id: string; nombre: string; descripcion: string | null; sku: string | null
    precio_mayorista: number | null; stock_actual: number; categoria_id: string
    product_categories: { nombre: string } | { nombre: string }[] | null
    mayorista_descuento_tipo: 'porcentaje' | 'monto' | null
    mayorista_descuento_valor: number | null
    mayorista_descuento_desde_cantidad: number | null
  }

  const lista = ((productos ?? []) as ProductoCatalogo[]).map(p => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    sku: p.sku,
    precio: p.precio_mayorista ?? 0,
    stock: p.stock_actual,
    categoria: Array.isArray(p.product_categories) ? p.product_categories[0]?.nombre : p.product_categories?.nombre ?? null,
    descuentoTipo: p.mayorista_descuento_tipo,
    descuentoValor: p.mayorista_descuento_valor,
    descuentoDesdeCantidad: p.mayorista_descuento_desde_cantidad,
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
      <CatalogoB2BCarrito productos={lista} ivaPct={(cfgComprador as { iva?: number } | null)?.iva ?? 19} />
    </div>
  )
}
