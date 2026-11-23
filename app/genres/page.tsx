import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { ArrowRight, Clapperboard } from "lucide-react"

const genres = ["Action", "Aventure", "Animation", "Comédie", "Crime", "Documentaire", "Drame", "Familial", "Fantastique", "Horreur", "Mystère", "Romance", "Science-fiction", "Thriller", "Guerre", "Western"]

export default function GenresPage() {
  return <><AppHeader /><main className="mx-auto max-w-7xl px-4 py-10 pb-24 sm:px-6"><div className="mb-8 flex items-center gap-3"><span className="jf-gradient flex size-11 items-center justify-center rounded-xl"><Clapperboard className="size-5 text-white" /></span><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Explorer par ambiance</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Genres de films</h1></div></div><p className="mb-8 max-w-2xl text-muted-foreground">Des sélections dédiées, alimentées par les films présents sur votre serveur Jellyfin.</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{genres.map((genre, index) => <Link key={genre} href={`/genres/${encodeURIComponent(genre.toLowerCase())}`} className="group relative flex min-h-28 items-end justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[.1] via-white/[.04] to-transparent p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_18px_50px_rgba(0,0,0,.32)]"><span className="absolute -right-2 -top-8 text-7xl font-black text-white/[.035]">{String(index + 1).padStart(2, "0")}</span><span className="relative text-xl font-bold">{genre}</span><ArrowRight className="relative size-5 text-white/45 transition group-hover:translate-x-1 group-hover:text-primary" /></Link>)}</div></main></>
}
