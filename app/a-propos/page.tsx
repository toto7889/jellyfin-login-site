import Link from "next/link"

export default function AboutPage() {
  return <main className="min-h-screen bg-[#081018] px-6 py-16 text-white"><div className="mx-auto max-w-3xl rounded-[2rem] border border-white/15 bg-white/[0.08] p-8 shadow-2xl backdrop-blur-2xl"><p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Jellyfin personal</p><h1 className="mt-4 text-4xl font-semibold">Votre médiathèque, simplement.</h1><p className="mt-5 leading-7 text-white/65">Cette interface permet de parcourir votre serveur Jellyfin, reprendre vos films et lancer une lecture adaptée à votre navigateur. Vos identifiants restent utilisés uniquement pour contacter votre serveur.</p><div className="mt-8 flex gap-3"><Link className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950" href="/">Accueil</Link><Link className="rounded-full border border-white/20 px-5 py-3 text-sm" href="/help">Centre d&apos;aide</Link></div></div></main>
}
