import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AdminAppSidebar } from '@/components/admin/app-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { MobileBottomNav } from '@/components/admin/mobile-bottom-nav'
import { getAdminDashboardStats } from '@/app/admin/actions/dashboard'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // 1. Check Auth (Session exist)
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 2. Check Admin Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        redirect('/') // Not authorized, go home
    }

    // Fetch dashboard stats for badge counts
    const stats = await getAdminDashboardStats()

    return (
        <SidebarProvider>
            <AdminAppSidebar />
            <SidebarInset>
                <AdminHeader />
                <main className="flex-1 overflow-auto bg-slate-50">
                    <div className="container mx-auto p-6 max-w-7xl pb-24 md:pb-6">
                        {children}
                    </div>
                </main>
                <MobileBottomNav
                    pendingRequests={stats.pendingClassRequests}
                    pendingCertificates={stats.pendingCertificates}
                />
            </SidebarInset>
        </SidebarProvider>
    )
}
