import { Suspense } from "react"
import type { Metadata } from "next"
import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { TvView } from "@/components/tv-view"

export const metadata: Metadata = {
  title: "Hub TV en direct",
  description: "Retrouvez les chaînes en direct et les programmes en cours de votre serveur Jellyfin.",
}

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
