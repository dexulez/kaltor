import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppSidebar from '@/components/layout/AppSidebar'
import MobileNav from '@/components/layout/MobileNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, roles(*)')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AppSidebar user={profile} />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      <MobileNav user={profile} />
    </div>
  )
}
