// Crea (o actualiza) el usuario administrador de cada tienda de prueba
// (una por plan de Kaltor). Idempotente: se puede correr varias veces.
//
// Requisitos previos (ejecutar en Supabase SQL Editor, en este orden):
//   1. supabase/kaltor_phase1_a_foundation.sql
//   2. supabase/seed_tiendas_prueba_planes.sql
//   3. supabase/add_store_users_multiempresa.sql
//
// Uso:
//   node --env-file=.env.local scripts/crear-usuarios-prueba.mjs

import { createClient } from '@supabase/supabase-js'

const PASSWORD_PRUEBA = 'Prueba2026!'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (revisa .env.local)')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function buscarUsuarioPorEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

async function main() {
  const { data: rolAdmin, error: rolErr } = await admin
    .from('roles')
    .select('id')
    .eq('nombre', 'administrador')
    .single()
  if (rolErr || !rolAdmin) throw rolErr ?? new Error('No existe el rol "administrador"')

  const { data: tiendas, error: tiendasErr } = await admin
    .from('stores')
    .select('id, nombre, slug, email, plan_id, plans(nombre)')
    .like('slug', 'prueba-%')
    .order('nombre')
  if (tiendasErr) throw tiendasErr
  if (!tiendas || tiendas.length === 0) {
    console.error('No hay tiendas de prueba. Corre primero supabase/seed_tiendas_prueba_planes.sql')
    process.exit(1)
  }

  for (const tienda of tiendas) {
    const email = tienda.email
    let usuario = await buscarUsuarioPorEmail(email)

    if (!usuario) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD_PRUEBA,
        email_confirm: true,
      })
      if (error) throw error
      usuario = data.user
      console.log(`Creado: ${email}`)
    } else {
      console.log(`Ya existía: ${email} (se actualiza perfil)`)
    }

    const nombreCompleto = `Admin prueba - ${tienda.nombre}`

    const { error: perfilErr } = await admin.from('user_profiles').upsert({
      id: usuario.id,
      nombre_completo: nombreCompleto,
      email,
      rol_id: rolAdmin.id,
      store_id: tienda.id,
      activo: true,
    }, { onConflict: 'id' })
    if (perfilErr) throw perfilErr

    const { error: storeUserErr } = await admin.from('store_users').upsert({
      user_id: usuario.id,
      store_id: tienda.id,
      rol_id: rolAdmin.id,
    }, { onConflict: 'user_id,store_id' })
    if (storeUserErr) throw storeUserErr
  }

  console.log('\nListo. Credenciales (misma clave para todos):', PASSWORD_PRUEBA)
  console.log(tiendas.map(t => `  ${t.email}  ->  ${t.plans?.nombre ?? t.plan_id}`).join('\n'))
}

main().catch(err => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
