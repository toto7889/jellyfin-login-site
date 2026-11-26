import type { Metadata } from "next"
import { AppHeader } from "@/components/app-header"
import { AuthGuard } from "@/components/auth-guard"
import { PersonDetailView } from "@/components/person-detail-view"

export const metadata: Metadata = {
  title: "Fiche artiste — JFLX",
  description: "Découvrez la filmographie TMDB et les films de la distribution présents dans votre bibliothèque Jellyfin.",
}

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ name?: string }>
}) {
  const [{ id }, { name }] = await Promise.all([params, searchParams])
  return <AuthGuard><AppHeader /><PersonDetailView personId={id} personName={name ?? id} /></AuthGuard>
}
