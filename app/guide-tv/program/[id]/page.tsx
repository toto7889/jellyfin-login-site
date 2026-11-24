import { Suspense } from "react"
import type { Metadata } from "next"
import { AuthGuard } from "@/components/auth-guard"
import { TvProgramView } from "@/components/tv-program-view"

export const metadata: Metadata = {
  title: "Informations du programme TV",
  description: "Consultez les horaires, le résumé et les détails du programme sur votre guide TV Jellyfin.",
}

export default async function TvProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AuthGuard><Suspense fallback={<main className="min-h-screen bg-[#090a0d]" />}><TvProgramView programId={id} /></Suspense></AuthGuard>
}
