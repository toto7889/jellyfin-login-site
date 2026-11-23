import { Tv } from "lucide-react"

export function TvRouteLoading({ guide = false }: { guide?: boolean }) {
  return <main role="status" aria-label={guide ? "Chargement du guide TV" : "Chargement de la télévision"} className="min-h-screen animate-in fade-in duration-300 bg-[#090a0d] px-4 pb-24 pt-8 text-white sm:px-7 lg:px-10">
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-8 flex items-end justify-between gap-6"><div className="space-y-3"><div className="h-3 w-28 animate-pulse rounded bg-white/10" /><div className="h-10 w-72 max-w-[75vw] animate-pulse rounded-xl bg-white/[.08]" /><div className="h-4 w-96 max-w-[82vw] animate-pulse rounded bg-white/[.05]" /></div><div className="hidden size-12 animate-pulse rounded-full bg-white/[.08] sm:block" /></div>
      {!guide ? <div className="mb-7 h-64 animate-pulse rounded-3xl border border-white/10 bg-[linear-gradient(110deg,#121318_8%,#1b1c23_18%,#121318_33%)] bg-[length:200%_100%]" /> : null}
      <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Tv className="size-4 text-white/35" /><div className="h-4 w-32 animate-pulse rounded bg-white/[.07]" /></div><div className="h-9 w-56 animate-pulse rounded-full bg-white/[.06]" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: guide ? 6 : 6 }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.025]" style={{ animationDelay: `${index * 50}ms` }}><div className="aspect-video animate-pulse bg-[linear-gradient(110deg,#121318_8%,#1b1c23_18%,#121318_33%)] bg-[length:200%_100%]" /><div className="space-y-3 p-4"><div className="h-3 w-24 animate-pulse rounded bg-white/[.07]" /><div className="h-4 w-3/4 animate-pulse rounded bg-white/[.09]" /><div className="h-3 w-1/2 animate-pulse rounded bg-white/[.05]" /></div></div>)}</div>
    </div>
  </main>
}
