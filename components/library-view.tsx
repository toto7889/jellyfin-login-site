"use client"

import useSWR from "swr"
import { Loader2 } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { MediaCard } from "@/components/media-card"
import {
  getItem,
  getItems,
  type JellyfinSession,
} from "@/lib/jellyfin"

export function LibraryView({ libraryId }: { libraryId: string }) {
  const { session } = useJellyfin()
  if (!session) return null
  return <LibraryContent session={session} libraryId={libraryId} />
}

function LibraryContent({
  session,
  libraryId,
}: {
  session: JellyfinSession
  libraryId: string
}) {
  const { data, error, isLoading } = useSWR(
    ["library", session.userId, libraryId],
    async () => {
      const [view, items] = await Promise.all([
        getItem(session, libraryId),
        getItems(session, {
          parentId: libraryId,
          includeItemTypes: "Movie,Series",
          recursive: true,
          sortBy: "SortName",
          limit: 200,
        }),
      ])
      return { view, items }
    },
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-6 py-20 text-center text-muted-foreground">
        Impossible de charger cette bibliothèque.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        {data.view.Name}
      </h1>
      {data.items.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {data.items.map((item) => (
            <MediaCard key={item.Id} item={item} session={session} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Aucun élément dans cette bibliothèque.</p>
      )}
    </div>
  )
}
