import type { Metadata } from "next"
import { AppHeader } from "@/components/app-header"
import { AuthGuard } from "@/components/auth-guard"
import { TmdbTitleView } from "@/components/tmdb-title-view"

export const metadata: Metadata = {
  title: "Découvrir un film — JFLX",
  description: "Informations, plateformes de streaming et séances en cinéma autour de vous.",
}

export default async function TmdbTitlePage({ params }: { params: Promise<{ mediaType: string; id: string }> }) {
  const { mediaType, id } = await params
  if ((mediaType !== "movie" && mediaType !== "tv") || !/^\d{1,12}$/.test(id)) {
    return <AuthGuard><AppHeader /><main className="min-h-[60vh] bg-[#08090c] px-5 py-24 text-center text-white"><h1 className="text-2xl font-bold">Titre invalide</h1></main></AuthGuard>
  }
  return <AuthGuard><AppHeader /><TmdbTitleView mediaType={mediaType} id={id} cinemaConfigured={Boolean(process.env.API_CINEMA_API_KEY)} /></AuthGuard>
}
