import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { IpAdminView } from "@/components/ip-admin-view"

export default function AdminIpPage() { return <AuthGuard><AppHeader /><IpAdminView /></AuthGuard> }
