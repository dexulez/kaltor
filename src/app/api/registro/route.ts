import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { TIPOS_EQUIPO } from '@/lib/tipoEquipo'

export async function POST(req: NextRequest) {
  let body: {
    nombre_negocio: string
    nombre_usuario: string
    email: string
    password: string
    plan_slug: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { nombre_negocio, nombre_usuario, email, password, plan_slug } = body

  if (!nombre_negocio?.trim() || !nombre_usuario?.trim() || !email?.trim() || !password || !plan_slug) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const admin = createServiceClient()

  // 1. Verificar que el plan exista
  const { data: plan } = await admin
    .from('plans')
    .select('id')
    .eq('slug', plan_slug)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 400 })
  }

  // 2. Obtener rol administrador
  const { data: rolAdmin } = await admin
    .from('roles')
    .select('id')
    .eq('nombre', 'administrador')
    .single()

  if (!rolAdmin) {
    return NextResponse.json({ error: 'Error interno: rol administrador no configurado' }, { status: 500 })
  }

  // 3. Crear usuario en Supabase Auth (auto-confirmado)
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
  })

  if (authErr || !authData.user) {
    const msg = authErr?.message ?? ''
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo' }, { status: 409 })
    }
    return NextResponse.json({ error: msg || 'Error al crear el usuario' }, { status: 500 })
  }

  const userId = authData.user.id

  // 4. Crear la tienda con 14 días de trial
  const trialHasta = new Date()
  trialHasta.setDate(trialHasta.getDate() + 14)

  const { data: store, error: storeErr } = await admin
    .from('stores')
    .insert({
      nombre:      nombre_negocio.trim(),
      email:       email.toLowerCase().trim(),
      plan_id:     plan.id,
      activo:      true,
      trial_hasta: trialHasta.toISOString(),
    })
    .select('id')
    .single()

  if (storeErr || !store) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Error al crear la tienda: ' + storeErr?.message }, { status: 500 })
  }

  // 5. Crear perfil del administrador
  // Usamos upsert porque el trigger handle_new_user ya inserta una fila parcial
  // en user_profiles cuando se crea el usuario en Auth. El upsert la sobreescribe
  // con todos los datos correctos (store_id, rol, comisiones, etc.)
  const { error: profileErr } = await admin.from('user_profiles').upsert({
    id:                    userId,
    nombre_completo:       nombre_usuario.trim(),
    email:                 email.toLowerCase().trim(),
    rol_id:                rolAdmin.id,
    store_id:              store.id,
    activo:                true,
    comision_base:         0,
    comision_pantalla:     0,
    comision_bateria:      0,
    comision_placa:        0,
    comision_software:     0,
    comision_camara:       0,
    comision_conector:     0,
    comision_otro:         0,
  }, { onConflict: 'id' })

  if (profileErr) {
    await admin.from('stores').delete().eq('id', store.id)
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Error al crear el perfil: ' + profileErr.message }, { status: 500 })
  }

  // 6. Crear configuración inicial de la tienda
  await admin.from('system_config').insert({
    store_id:                     store.id,
    nombre_local:                 nombre_negocio.trim(),
    iva:                          19,
    ppm:                          3,
    comision_debito:              0,
    comision_credito:             0,
    comision_transferencia:       0,
    dias_garantia_default:        90,
    mostrar_precio_en_presupuesto: true,
    wa_activo:                    false,
    wa_instancia:                 'default',
  }).then(({ error }) => {
    if (error) console.error('[registro] error system_config:', error.message)
  })

  // 7. Asignar módulos del plan a la tienda
  const { data: planModules } = await admin
    .from('plan_modules')
    .select('module_key')
    .eq('plan_id', plan.id)

  if (planModules && planModules.length > 0) {
    await admin.from('store_modules').insert(
      planModules.map(pm => ({
        store_id:   store.id,
        module_key: pm.module_key,
        activo:     true,
      }))
    ).then(({ error }) => {
      if (error) console.error('[registro] error store_modules:', error.message)
    })
  }

  // 8. Sembrar catálogo de tipos de equipo por defecto
  await admin.from('equipment_types').insert(
    TIPOS_EQUIPO.map((t, i) => ({
      store_id: store.id,
      value:    t.value,
      label:    t.label,
      icon:     t.icon,
      template: t.value,
      orden:    i,
    }))
  ).then(({ error }) => {
    if (error) console.error('[registro] error equipment_types:', error.message)
  })

  return NextResponse.json({ ok: true })
}
