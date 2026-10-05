import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { IpView } from "@/components/security-view"

export default function IpPage() { return <AuthGuard><AppHeader /><IpView /></AuthGuard> }
