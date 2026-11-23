"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { Loader2, Search, SearchX, SlidersHorizontal } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { MediaCard } from "@/components/media-card"
import { searchItems, type BaseItem, type JellyfinSession } from "@/lib/jellyfin"

const filters = [
  { label: "Tout", value: "all" },
  { label: "Films", value: "Movie" },
  { label: "Séries", value: "Series" },
  { label: "Épisodes", value: "Episode" },
] as const

export function SearchView() {
  const { session } = useJellyfin()
  const searchParams = useSearchParams()
  const q = searchParams.get("q")?.trim() ?? ""
  if (!session) return null
  return <SearchContent session={session} query={q} />
}

function SearchContent({ session, query }: { session: JellyfinSession; query: string }) {
  const [type, setType] = useState<(typeof filters)[number]["value"]>("all")
  const [sort, setSort] = useState("relevance")
  const { data, error, isLoading } = useSWR(
    query ? ["search", session.userId, query] : null,
    () => searchItems(session, query),
    { keepPreviousData: true, dedupingInterval: 30_000, revalidateOnFocus: false },
  )

  const results = useMemo(() => {
    const filtered = (data ?? []).filter((item) => type === "all" || item.Type === type)
    return [...filtered].sort((a, b) => {
      if (sort === "newest") return (b.ProductionYear ?? 0) - (a.ProductionYear ?? 0)
      if (sort === "rating") return (b.CommunityRating ?? 0) - (a.CommunityRating ?? 0)
      if (sort === "title") return a.Name.localeCompare(b.Name, "fr")
      return 0
    })
  }, [data, sort, type])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6">
      <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.07] to-transparent p-5 sm:p-7">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-primary"><Search className="size-4" /> Explorer le catalogue</div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          {query ? <>Résultats pour <span className="jf-gradient-text">« {query} »</span></> : "Recherche"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Films, séries et épisodes de votre médiathèque.</p>
      </div>

      {!query ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-center text-muted-foreground">
          <Search className="size-8" /><p>Recherchez un titre depuis la barre en haut de page.</p>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[40dvh] items-center justify-center" role="status" aria-label="Chargement des résultats"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-muted-foreground">La recherche est momentanément indisponible. Réessayez dans un instant.</p>
      ) : data?.length ? (
        <>
          <div className="mb-6 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par type">
              {filters.map((filter) => {
                const count = filter.value === "all" ? data.length : data.filter((item) => item.Type === filter.value).length
                return <button key={filter.value} type="button" onClick={() => setType(filter.value)} aria-pressed={type === filter.value} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${type === filter.value ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {filter.label}<span className="ml-2 text-xs opacity-65">{count}</span>
                </button>
              })}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground"><SlidersHorizontal className="size-4" /><span className="sr-only">Trier les résultats</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <option value="relevance">Pertinence</option><option value="newest">Plus récents</option><option value="rating">Mieux notés</option><option value="title">Titre A–Z</option>
              </select>
            </label>
          </div>
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">{results.length} résultat{results.length > 1 ? "s" : ""}</p>
          {results.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{results.map((item: BaseItem) => <MediaCard key={item.Id} item={item} session={session} />)}</div> : <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground"><SearchX className="size-9" /><p>Aucun résultat dans cette catégorie.</p></div>}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground"><SearchX className="size-10" /><p>Aucun résultat trouvé.</p></div>
      )}
    </div>
  )
}
