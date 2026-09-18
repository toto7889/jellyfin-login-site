import { Suspense } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppHeader } from "@/components/app-header"
import { SearchView } from "@/components/search-view"

export default function SearchPage() {
  return (
    <AuthGuard>
      <Suspense>
        <AppHeader />
      </Suspense>
      <main>
        <Suspense>
          <SearchView />
        </Suspense>
      </main>
    </AuthGuard>
  )
}
