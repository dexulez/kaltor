import { createServiceClient } from '@/lib/supabase/server'

type Admin = ReturnType<typeof createServiceClient>

export interface CrearPlanEspecialParams {
  storeId: string
  storeSlug?: string | null
  nombre: string
  precioMensual: number
  precioMensualUsd: number
  maxUsuarios: number | null
  sesionUnica: boolean
  basadoEnPlanId: string
  planBaseId?: string | null
}

export interface PlanEspecialCreado {
  id: string
  slug: string
  nombre: string
  precio_mensual: number
  precio_mensual_usd: number
}

/**
 * Crea un plan especial 1:1 para una tienda (precio_mensual/usd propios, es_especial=true,
 * store_especial_id=storeId), clona los módulos del plan de referencia y reasigna tanto
 * stores.plan_id como store_modules. No genera el cobro en Flow/PayPal — eso queda a
 * cargo del llamador (ver generarCobroPlanEspecial en superadmin/stores/[id]/route.ts).
 */
export async function crearPlanEspecialParaTienda(
  admin: Admin,
  params: CrearPlanEspecialParams
): Promise<{ ok: true; plan: PlanEspecialCreado } | { ok: false; error: string }> {
  const {
    storeId, storeSlug, nombre, maxUsuarios, sesionUnica, basadoEnPlanId, planBaseId,
  } = params

  const precioMensual = Math.round(params.precioMensual)
  const precioMensualUsd = Math.round(params.precioMensualUsd * 100) / 100
  const slug = `especial-${storeSlug ?? storeId}-${Date.now().toString(36)}`

  const { data: newPlan, error: planInsertErr } = await admin
    .from('plans')
    .insert({
      nombre,
      slug,
      precio_mensual: precioMensual,
      precio_anual: precioMensual * 10,
      precio_mensual_usd: precioMensualUsd,
      precios_pais: {},
      max_usuarios: maxUsuarios,
      sesion_unica: sesionUnica,
      activo: false,
      es_especial: true,
      store_especial_id: storeId,
      plan_base_id: planBaseId ?? null,
    })
    .select('id, slug, nombre, precio_mensual, precio_mensual_usd')
    .single()

  if (planInsertErr || !newPlan) {
    return { ok: false, error: planInsertErr?.message ?? 'No se pudo crear el plan' }
  }

  const { data: refMods } = await admin
    .from('plan_modules').select('module_key').eq('plan_id', basadoEnPlanId)

  if (refMods && refMods.length > 0) {
    await admin.from('plan_modules').insert(
      refMods.map(m => ({ plan_id: newPlan.id, module_key: m.module_key }))
    )
  }

  const { error: assignErr } = await admin.from('stores').update({ plan_id: newPlan.id }).eq('id', storeId)
  if (assignErr) return { ok: false, error: assignErr.message }

  if (refMods && refMods.length > 0) {
    await admin.from('store_modules').delete().eq('store_id', storeId)
    const { error: modsErr } = await admin.from('store_modules').insert(
      refMods.map(m => ({ store_id: storeId, module_key: m.module_key, activo: true }))
    )
    if (modsErr) console.error('[planesEspeciales] store_modules update error:', modsErr.message)
  }

  return { ok: true, plan: newPlan }
}
