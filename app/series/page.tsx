import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { SeriesHubView } from "@/components/series-hub-view"

export default function SeriesPage() {
  return (
    <AuthGuard>
      <AppHeader />
      <SeriesHubView />
    </AuthGuard>
  )
}
