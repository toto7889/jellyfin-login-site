import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { FilmHubView } from "@/components/film-hub-view"

export default function FilmsPage() {
  return (
    <AuthGuard>
      <AppHeader />
      <FilmHubView />
    </AuthGuard>
  )
}
