# TechRepair Pro

Sistema web para gestión de taller técnico, reparaciones, caja, compras, inventario, usuarios e informes.

## Requisitos

- Node.js 20+
- Proyecto Supabase configurado
- Variables de entorno definidas

## Variables de entorno

Usa [.env.example](.env.example) como base.

Variables necesarias:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Desarrollo local

1. Copia `.env.example` a `.env.local`
2. Completa las variables de entorno
3. Instala dependencias
4. Ejecuta el proyecto

```bash
npm install
npm run dev
```

## Validación local

```bash
npm run lint
npm run build
```

## Despliegue remoto recomendado: Vercel + Supabase

### 1. Publicar el frontend en Vercel

1. Sube este proyecto a GitHub
2. En Vercel, crea un proyecto importando el repositorio
3. Configura como Root Directory la carpeta del proyecto si el repositorio contiene más archivos en niveles superiores
4. Agrega estas variables de entorno en Vercel:
	- `NEXT_PUBLIC_SITE_URL` = URL pública final del proyecto, por ejemplo `https://app.kaltorpos.com`
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY`
5. Ejecuta el deploy

### 2. Configurar Supabase Auth para producción

En el panel de Supabase:

1. Ve a Authentication → URL Configuration
2. Define `Site URL` con la URL pública de Vercel
3. Agrega en `Redirect URLs` al menos:
	- `https://tu-dominio.vercel.app/auth/confirm`
	- `https://tu-dominio.vercel.app/**`
	- `http://localhost:3000/auth/confirm`
4. Verifica que el proveedor Email esté habilitado si usarás invitaciones de usuarios

### 3. Base de datos

Si la base aún no existe en producción:

1. Abre Supabase SQL Editor
2. Ejecuta [supabase/schema.sql](supabase/schema.sql)
3. Si corresponde, ejecuta también [supabase/fix_trigger.sql](supabase/fix_trigger.sql)

## Notas de producción

- Las invitaciones de usuarios usan `SUPABASE_SERVICE_ROLE_KEY`, por lo que esa variable es obligatoria en Vercel.
- Las invitaciones redirigen a `/auth/confirm`, por lo que la URL pública debe estar correctamente configurada en `NEXT_PUBLIC_SITE_URL` y en Supabase Auth.
- El proyecto ya compila en producción con `npm run build`.
