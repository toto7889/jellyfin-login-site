import { Suspense } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { TvView } from "@/components/tv-view"

export default function TvPage() {
  return (
    <AuthGuard>
      <Suspense>
        <AppHeader />
      </Suspense>
      <main>
        <TvView />
      </main>
    </AuthGuard>
  )
}
