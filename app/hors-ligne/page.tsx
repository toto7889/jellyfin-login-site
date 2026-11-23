import Link from "next/link"
import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return <main className="grid min-h-dvh place-items-center bg-background px-5"><section className="max-w-lg rounded-3xl border border-border bg-card/70 p-8 text-center shadow-2xl sm:p-12"><p className="text-2xl font-black tracking-tight text-[#e50914]">JFLX</p><WifiOff className="mx-auto mt-8 size-10 text-primary" /><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-primary">Connexion interrompue</p><h1 className="mt-2 text-3xl font-bold">Contenu indisponible hors ligne</h1><p className="mt-3 text-muted-foreground">JFLX a besoin d’une connexion à votre serveur Jellyfin pour charger vos films, séries et chaînes TV. Rétablissez votre connexion puis réessayez.</p><Link href="/" className="mt-7 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground">Réessayer</Link></section></main>
}
