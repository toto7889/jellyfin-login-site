"use client"

import useSWR from "swr"
import { useParams } from "next/navigation"
import { Loader2, Clapperboard } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { MediaCard } from "@/components/media-card"
import { useJellyfin } from "@/components/jellyfin-provider"
import { getItems } from "@/lib/jellyfin"

export default function GenrePage() {
  const params = useParams<{ genre: string }>()
  const genre = decodeURIComponent(params.genre).replaceAll("-", " ")
  const { session } = useJellyfin()
  const { data, isLoading, error } = useSWR(session ? ["genre-movies", session.userId] : null, () => getItems(session!, { includeItemTypes: "Movie", limit: 200 }))
  const films = (data ?? []).filter((item) => item.Genres?.some((value) => value.toLocaleLowerCase("fr") === genre.toLocaleLowerCase("fr")))
  return <><AppHeader /><main className="mx-auto max-w-7xl px-4 py-10 pb-24 sm:px-6"><div className="mb-8 flex items-center gap-3"><span className="jf-gradient flex size-11 items-center justify-center rounded-xl"><Clapperboard className="size-5 text-white" /></span><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Collection cinéma</p><h1 className="text-3xl font-black capitalize tracking-tight sm:text-4xl">{genre}</h1></div></div>{isLoading ? <div className="flex min-h-56 items-center justify-center" role="status" aria-label="Chargement des films"><Loader2 className="size-6 animate-spin text-primary" /></div> : error ? <p role="alert" className="rounded-xl border border-destructive/30 p-5 text-muted-foreground">Impossible de charger les films de ce genre depuis Jellyfin.</p> : films.length ? <><p className="mb-5 text-sm text-muted-foreground">{films.length} film{films.length === 1 ? "" : "s"} dans votre médiathèque</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{films.map((film) => <MediaCard key={film.Id} item={film} session={session!} />)}</div></> : <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">Aucun film de ce genre dans les 200 premiers résultats de votre médiathèque.</p>}</main></>
}
