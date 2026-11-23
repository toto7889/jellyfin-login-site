import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { SecurityCenterView } from "@/components/security-view"

export default function SecurityPage() {
  return <AuthGuard><AppHeader /><SecurityCenterView /></AuthGuard>
}
