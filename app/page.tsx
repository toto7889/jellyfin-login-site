import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { HomeView } from "@/components/home-view"

export default function Page() {
  return (
    <AuthGuard>
      <AppHeader />
      <main>
        <HomeView />
      </main>
    </AuthGuard>
  )
}
