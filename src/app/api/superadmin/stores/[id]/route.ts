import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAIL = process.env.KALTOR_SUPER_ADMIN_EMAIL

async function verifySuperAdmin(): Promise<boolean> {
  if (!SUPER_ADMIN_EMAIL) return false
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === SUPER_ADMIN_EMAIL
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

      default:
        return NextResponse.json({ error: `Acción desconocida: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    console.error('[superadmin/stores]', action, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
