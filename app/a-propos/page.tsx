import Link from "next/link"
import { ArrowLeft, CircleHelp, LockKeyhole, MonitorPlay, Radio, ShieldCheck } from "lucide-react"

const features = [
  { icon: MonitorPlay, title: "Une bibliothèque unifiée", description: "Parcourez films, séries, musique et clips présents sur votre serveur Jellyfin." },
  { icon: Radio, title: "Lecture adaptée", description: "Le lecteur utilise les capacités du navigateur et les flux proposés par votre serveur." },
  { icon: LockKeyhole, title: "Votre compte Jellyfin", description: "La connexion et les autorisations restent gérées par le serveur Jellyfin auquel vous vous connectez." },
]

export default function AboutPage() {
  return <main className="min-h-screen bg-[#08090c] px-5 py-8 text-white sm:px-8 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"><ArrowLeft className="size-4" />Retour à JFLX</Link>
      <section className="relative mt-7 overflow-hidden rounded-[2rem] border border-white/10 bg-[#111318] px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_8%,rgba(229,9,20,.16),transparent_45%),radial-gradient(ellipse_at_10%_100%,rgba(0,164,220,.12),transparent_40%)]" />
        <div className="relative max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[.26em] text-[#f2bb55]">JFLX · votre espace Jellyfin</p><h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-6xl">Votre médiathèque, pensée pour tous vos écrans.</h1><p className="mt-5 max-w-2xl text-pretty text-sm leading-7 text-white/60 sm:text-base">JFLX accompagne votre serveur Jellyfin avec des hubs de découverte, des fiches détaillées et une lecture conçue pour le téléphone, la tablette et l’ordinateur.</p></div>
      </section>
      <section aria-label="Fonctionnalités JFLX" className="mt-6 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><span className="flex size-11 items-center justify-center rounded-xl bg-white/[.07] text-white/80"><Icon className="size-5" /></span><h2 className="mt-5 text-base font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-white/55">{description}</p></article>)}</section>
      <section className="mt-8 grid gap-6 rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8"><div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-white/45"><ShieldCheck className="size-4" />Aide et confidentialité</p><h2 className="mt-3 text-xl font-semibold">Besoin d’informations ?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Consultez les conseils d’utilisation et les détails de sécurité. La disponibilité des contenus et des commandes dépend des droits configurés sur votre serveur Jellyfin.</p></div><div className="flex flex-wrap gap-3"><Link href="/help" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm hover:bg-white/10"><CircleHelp className="size-4" />Centre d’aide</Link><Link href="/securite" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/90"><ShieldCheck className="size-4" />Sécurité</Link></div></section>
    </div>
  </main>
}
