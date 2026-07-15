import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createPlan as createFlowPlan } from '@/lib/flow/client'
import { createPlan as createPaypalPlan } from '@/lib/paypal/client'

const SUPER_ADMIN_EMAIL = process.env.KALTOR_SUPER_ADMIN_EMAIL

async function verifySuperAdmin(): Promise<boolean> {
  if (!SUPER_ADMIN_EMAIL) return false
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === SUPER_ADMIN_EMAIL
}

// Intenta generar el plan de cobro gemelo en Flow y PayPal para un plan especial.
// Best-effort: cada pasarela falla de forma independiente (p. ej. credenciales aún
// no configuradas) sin abortar la operación completa. Devuelve advertencias legibles.
async function generarCobroPlanEspecial(
  admin: ReturnType<typeof createServiceClient>,
  plan: { id: string; slug: string; nombre: string; precio_mensual: number; precio_mensual_usd: number }
): Promise<string[]> {
  const warnings: string[] = []

  try {
    const flowPlan = await createFlowPlan({
      planId: `kaltor_especial_${plan.slug}`,
      name: plan.nombre,
      amount: Math.round(plan.precio_mensual),
    })
    await admin.from('plans').update({ flow_plan_id: flowPlan.planId }).eq('id', plan.id)
  } catch (err) {
    warnings.push(`Flow: ${err instanceof Error ? err.message : 'error desconocido'}`)
  }

  try {
    const productId = process.env.PAYPAL_PRODUCT_ID
    if (!productId) throw new Error('Falta PAYPAL_PRODUCT_ID en las variables de entorno')
    const paypalPlan = await createPaypalPlan({
      productId,
      name: plan.nombre,
      amountUsd: plan.precio_mensual_usd,
    })
    await admin.from('plans').update({ paypal_plan_id: paypalPlan.id }).eq('id', plan.id)
  } catch (err) {
    warnings.push(`PayPal: ${err instanceof Error ? err.message : 'error desconocido'}`)
  }

  return warnings
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySuperAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const { action } = body
  const admin = createServiceClient()
  const { id: storeId } = await params

  const { data: store, error: storeErr } = await admin
    .from('stores')
    .select('id, activo, trial_hasta, plan_id')
    .eq('id', storeId)
    .single()

  if (storeErr || !store) {
    return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
  }

  try {
    switch (action) {
      case 'extend_trial': {
        const days = Number(body.days)
        if (!Number.isInteger(days) || days < 1 || days > 365) {
          return NextResponse.json({ error: 'Días inválidos (1-365)' }, { status: 400 })
        }
        // Sumar desde el trial actual (si no venció) o desde hoy
        const base = (store.trial_hasta && new Date(store.trial_hasta) > new Date())
          ? new Date(store.trial_hasta)
          : new Date()
        base.setDate(base.getDate() + days)

        const { error } = await admin.from('stores').update({
          trial_hasta:    base.toISOString(),
          billing_status: 'trial',
        }).eq('id', storeId)
        if (error) throw error
        break
      }

      case 'change_plan': {
        const { plan_id } = body
        if (!plan_id) return NextResponse.json({ error: 'plan_id requerido' }, { status: 400 })

        const { data: plan, error: planErr } = await admin
          .from('plans').select('id').eq('id', plan_id).single()
        if (planErr || !plan) {
          return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
        }

        const { error: updateErr } = await admin.from('stores').update({ plan_id }).eq('id', storeId)
        if (updateErr) throw updateErr

        // Reasignar módulos del nuevo plan
        const { data: planMods } = await admin
          .from('plan_modules').select('module_key').eq('plan_id', plan_id)

        if (planMods && planMods.length > 0) {
          await admin.from('store_modules').delete().eq('store_id', storeId)
          const { error: modsErr } = await admin.from('store_modules').insert(
            planMods.map(pm => ({ store_id: storeId, module_key: pm.module_key, activo: true }))
          )
          if (modsErr) console.error('[superadmin] store_modules update error:', modsErr.message)
        }
        break
      }

      case 'set_billing_status': {
        const valid = ['trial', 'active', 'pending', 'past_due', 'cancelled', 'suspended']
        if (!valid.includes(body.status)) {
          return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
        }
        const { error } = await admin.from('stores').update({ billing_status: body.status }).eq('id', storeId)
        if (error) throw error
        break
      }

      case 'toggle_active': {
        const { error } = await admin.from('stores').update({ activo: !store.activo }).eq('id', storeId)
        if (error) throw error
        break
      }

      case 'toggle_module': {
        const { module_key, activo } = body
        if (!module_key || typeof activo !== 'boolean') {
          return NextResponse.json({ error: 'module_key y activo requeridos' }, { status: 400 })
        }
        // Garantizar que el key exista en modules (FK) antes del upsert
        await admin.from('modules').upsert(
          { key: module_key, nombre: module_key },
          { onConflict: 'key' }
        )
        const { error } = await admin
          .from('store_modules')
          .upsert({ store_id: storeId, module_key, activo }, { onConflict: 'store_id,module_key' })
        if (error) throw error
        break
      }

      case 'create_special_plan': {
        const nombre = String(body.nombre ?? '').trim()
        const precioMensual = Number(body.precio_mensual)
        const precioMensualUsd = Number(body.precio_mensual_usd)
        const maxUsuarios = body.max_usuarios !== undefined && body.max_usuarios !== null && body.max_usuarios !== ''
          ? Number(body.max_usuarios)
          : null
        const sesionUnica = !!body.sesion_unica
        const basadoEnPlanId = body.basado_en_plan_id as string | undefined

        if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
        if (!Number.isFinite(precioMensual) || precioMensual <= 0) {
          return NextResponse.json({ error: 'precio_mensual inválido' }, { status: 400 })
        }
        if (!Number.isFinite(precioMensualUsd) || precioMensualUsd <= 0) {
          return NextResponse.json({ error: 'precio_mensual_usd inválido' }, { status: 400 })
        }
        if (!basadoEnPlanId) {
          return NextResponse.json({ error: 'Selecciona en qué plan basar los módulos' }, { status: 400 })
        }

        const { data: storeFull } = await admin.from('stores').select('slug').eq('id', storeId).single()
        const slug = `especial-${storeFull?.slug ?? storeId}-${Date.now().toString(36)}`
        const precioMensualRedondeado = Math.round(precioMensual)
        const precioUsdRedondeado = Math.round(precioMensualUsd * 100) / 100

        const { data: newPlan, error: planInsertErr } = await admin
          .from('plans')
          .insert({
            nombre,
            slug,
            precio_mensual: precioMensualRedondeado,
            precio_anual: precioMensualRedondeado * 10,
            precio_mensual_usd: precioUsdRedondeado,
            precios_pais: {},
            max_usuarios: maxUsuarios,
            sesion_unica: sesionUnica,
            activo: false,
            es_especial: true,
            store_especial_id: storeId,
          })
          .select('id, slug')
          .single()

        if (planInsertErr || !newPlan) {
          return NextResponse.json({ error: planInsertErr?.message ?? 'No se pudo crear el plan' }, { status: 500 })
        }

        // Clonar módulos del plan de referencia elegido
        const { data: refMods } = await admin
          .from('plan_modules').select('module_key').eq('plan_id', basadoEnPlanId)

        if (refMods && refMods.length > 0) {
          await admin.from('plan_modules').insert(
            refMods.map(m => ({ plan_id: newPlan.id, module_key: m.module_key }))
          )
        }

        const { error: assignErr } = await admin.from('stores').update({ plan_id: newPlan.id }).eq('id', storeId)
        if (assignErr) throw assignErr

        // Reasignar módulos de la tienda (mismo patrón que change_plan)
        if (refMods && refMods.length > 0) {
          await admin.from('store_modules').delete().eq('store_id', storeId)
          const { error: modsErr } = await admin.from('store_modules').insert(
            refMods.map(m => ({ store_id: storeId, module_key: m.module_key, activo: true }))
          )
          if (modsErr) console.error('[superadmin] store_modules update error:', modsErr.message)
        }

        const warnings = await generarCobroPlanEspecial(admin, {
          id: newPlan.id,
          slug: newPlan.slug,
          nombre,
          precio_mensual: precioMensualRedondeado,
          precio_mensual_usd: precioUsdRedondeado,
        })

        return NextResponse.json({ ok: true, plan_id: newPlan.id, warnings })
      }

      case 'retry_special_plan_billing': {
        const { data: plan, error: planErr } = await admin
          .from('plans')
          .select('id, slug, nombre, precio_mensual, precio_mensual_usd, es_especial')
          .eq('id', store.plan_id)
          .single()

        if (planErr || !plan || !plan.es_especial) {
          return NextResponse.json({ error: 'Esta tienda no tiene un plan especial asignado' }, { status: 400 })
        }

        const warnings = await generarCobroPlanEspecial(admin, plan)
        return NextResponse.json({ ok: true, warnings })
      }

      default:
        return NextResponse.json({ error: `Acción desconocida: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error
      ? err.message
      : (err as { message?: string })?.message ?? 'Error interno'
    console.error('[superadmin/stores]', action, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
