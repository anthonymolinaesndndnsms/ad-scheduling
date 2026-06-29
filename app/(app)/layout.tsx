import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 border-r border-zinc-800 flex-col">
        <Sidebar user={session.user} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-black">
          <MobileNav user={session.user} />
        </div>
      </div>
    </div>
  )
}
