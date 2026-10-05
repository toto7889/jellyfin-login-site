import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { VerificationView } from "@/components/security-view"

export default function VerificationPage() { return <AuthGuard><AppHeader /><VerificationView /></AuthGuard> }
