import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { FavoritesView } from "@/components/favorites-view"

export default function FavoritesPage() {
  return <AuthGuard><AppHeader /><FavoritesView /></AuthGuard>
}
