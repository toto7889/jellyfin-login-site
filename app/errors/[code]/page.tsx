import Link from "next/link"
import { notFound } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { UnauthorizedErrorView } from "@/components/unauthorized-error-view"
import { ArrowLeft, CircleAlert } from "lucide-react"

const statuses: Record<string, { title: string; message: string }> = {
  "403": { title: "Accès refusé", message: "Votre compte ne dispose pas des autorisations nécessaires." },
  "404": { title: "Page introuvable", message: "Cette page n’existe pas ou a été déplacée." },
  "500": { title: "Erreur serveur", message: "Une erreur inattendue empêche le chargement. Réessayez plus tard." },
  "501": { title: "Fonction indisponible", message: "Cette fonctionnalité n’est pas prise en charge pour le moment." },
  "503": { title: "Service indisponible", message: "Le serveur Jellyfin ou ce service est momentanément indisponible." },
}

export default async function StatusPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  if (code === "401") return <UnauthorizedErrorView />

  const status = statuses[code]
  if (!status) notFound()
  return <><AppHeader /><main className="grid min-h-[72dvh] place-items-center px-5 pb-24"><section className="max-w-lg text-center"><CircleAlert className="mx-auto size-12 text-primary" /><p className="mt-6 font-mono text-7xl font-black tracking-tighter text-white/15">{code}</p><h1 className="mt-2 text-3xl font-bold">{status.title}</h1><p className="mt-3 text-muted-foreground">{status.message}</p><Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:brightness-110"><ArrowLeft className="size-4" /> Retour à l’accueil</Link></section></main></>
}
