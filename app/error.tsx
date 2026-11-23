"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CircleAlert, RotateCcw } from "lucide-react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[JFLX] Page error", error) }, [error])
  return <main className="grid min-h-dvh place-items-center bg-background px-5"><section className="max-w-md text-center"><CircleAlert className="mx-auto size-12 text-destructive" /><p className="mt-5 font-mono text-7xl font-black text-white/15">500</p><h1 className="mt-2 text-2xl font-bold">Une erreur est survenue</h1><p className="mt-3 text-muted-foreground">La page n’a pas pu se charger. Vous pouvez réessayer ou revenir à l’accueil.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"><RotateCcw className="size-4" /> Réessayer</button><Link href="/" className="rounded-full border border-border px-5 py-3 font-medium">Accueil</Link></div></section></main>
}
