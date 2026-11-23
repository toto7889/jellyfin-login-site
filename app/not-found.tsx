import Link from "next/link"
import { ArrowLeft, SearchX } from "lucide-react"
import { AppHeader } from "@/components/app-header"

export default function NotFound() {
  return <><AppHeader /><main className="grid min-h-[75dvh] place-items-center px-5 pb-24"><section className="max-w-lg text-center"><SearchX className="mx-auto size-12 text-primary" /><p className="mt-6 font-mono text-7xl font-black tracking-tighter text-white/15">404</p><h1 className="mt-2 text-3xl font-bold">Cette page est introuvable</h1><p className="mt-3 text-muted-foreground">Le lien est peut-être ancien ou la page a été déplacée.</p><Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:brightness-110"><ArrowLeft className="size-4" /> Retour à l’accueil</Link></section></main></>
}
