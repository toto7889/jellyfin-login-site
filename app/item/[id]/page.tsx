import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { DetailView } from "@/components/detail-view"

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AuthGuard>
      <AppHeader />
      <main>
        <DetailView itemId={id} />
      </main>
    </AuthGuard>
  )
}
