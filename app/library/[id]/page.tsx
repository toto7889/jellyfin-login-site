import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { LibraryView } from "@/components/library-view"

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AuthGuard>
      <AppHeader />
      <main>
        <LibraryView libraryId={id} />
      </main>
    </AuthGuard>
  )
}
