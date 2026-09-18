"use client"

import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Loader2, SearchX } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { MediaCard } from "@/components/media-card"
import { searchItems, type JellyfinSession } from "@/lib/jellyfin"

export function SearchView() {
  const { session } = useJellyfin()
  const searchParams = useSearchParams()
  const q = searchParams.get("q")?.trim() ?? ""
  if (!session) return null
  return <SearchContent session={session} query={q} />
}

function SearchContent({
  session,
  query,
}: {
  session: JellyfinSession
  query: string
}) {
  const { data, error, isLoading } = useSWR(
    query ? ["search", session.userId, query] : null,
    () => searchItems(session, query),
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        {query ? (
          <>
            Résultats pour{" "}
            <span className="jf-gradient-text">«&nbsp;{query}&nbsp;»</span>
          </>
        ) : (
          "Recherche"
        )}
      </h1>

      {!query ? (
        <p className="text-muted-foreground">
          Saisissez un titre dans la barre de recherche en haut.
        </p>
      ) : isLoading ? (
        <div className="flex min-h-[40dvh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-muted-foreground">Erreur lors de la recherche.</p>
      ) : data && data.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {data.map((item) => (
            <MediaCard key={item.Id} item={item} session={session} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
          <SearchX className="size-10" />
          <p>Aucun résultat trouvé.</p>
        </div>
      )}
    </div>
  )
}
