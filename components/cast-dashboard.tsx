"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Cast, Check, CircleHelp, Clapperboard, Loader2, Monitor, Pause, Play, RefreshCw, Search, SkipBack, SkipForward, Smartphone, Speaker, Square, Tv2, Volume2, X } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { Button } from "@/components/ui/button"
import { getLatest, getPlaybackSessions, imageUrl, seekPlaybackSession, sendPlaybackCommand, startPlaybackOnSession, type BaseItem, type JellyfinPlaybackSession } from "@/lib/jellyfin"

const tickSeconds = 10_000_000

export function CastDashboard() {
  const { session } = useJellyfin()
  const [activeView, setActiveView] = useState<"appareils" | "bibliotheque">("appareils")
  const [selectedId, setSelectedId] = useState("")
  const [notice, setNotice] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [busyItem, setBusyItem] = useState("")
  const { data: devices, error: devicesError, isLoading: devicesLoading, mutate: refreshDevices } = useSWR(
    session ? ["cast-devices", session.userId] : null,
    () => getPlaybackSessions(session!),
    { refreshInterval: 8000, revalidateOnFocus: true },
  )
  const { data: items, isLoading: itemsLoading } = useSWR(
    session ? ["cast-latest", session.userId] : null,
    () => getLatest(session!, undefined, 16),
    { revalidateOnFocus: false },
  )
  const controllableDevices = useMemo(() => (devices ?? []).filter((device) => device.SupportsRemoteControl), [devices])
  const selectedDevice = controllableDevices.find((device) => device.Id === selectedId) ?? controllableDevices[0]
  const playingItem = selectedDevice?.NowPlayingItem
  const position = selectedDevice?.PlayState?.PositionTicks ?? 0
  const duration = playingItem?.RunTimeTicks ?? 0
  const progress = duration ? Math.min(100, (position / duration) * 100) : 0

  async function runCommand(action: () => Promise<void>, successMessage: string) {
    setErrorMessage("")
    try {
      await action()
      setNotice(successMessage)
      await refreshDevices()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "La commande Jellyfin a échoué.")
    }
  }

  async function playOnDevice(item: BaseItem, command: "PlayNow" | "PlayNext") {
    if (!session || !selectedDevice) return
    setBusyItem(item.Id)
    setNotice("")
    setErrorMessage("")
    try {
      await startPlaybackOnSession(session, selectedDevice.Id, item.Id, command)
      setNotice(command === "PlayNext" ? `${item.Name} ajouté à la suite.` : `Lecture envoyée à ${selectedDevice.DeviceName || "l’appareil"}.`)
      await refreshDevices()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d’envoyer la lecture.")
    } finally {
      setBusyItem("")
    }
  }

  async function seekBy(seconds: number) {
    if (!session || !selectedDevice?.PlayState?.CanSeek) return
    await runCommand(
      () => seekPlaybackSession(session, selectedDevice.Id, Math.max(0, position + seconds * tickSeconds)),
      "Position de lecture mise à jour.",
    )
  }

  return <main className="min-h-screen px-4 pb-28 pt-6 text-foreground sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111821] p-5 shadow-2xl sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-32 size-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.22em] text-primary"><Cast className="size-4" />Jellyfin Connect</div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Votre cinéma, <span className="text-white/55">sur grand écran.</span></h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/60 sm:text-base">Choisissez un lecteur Jellyfin connecté, puis pilotez la lecture depuis cette télécommande pensée pour tablette.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span className={`size-2.5 rounded-full ${selectedDevice ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.7)]" : "bg-amber-400"}`} />
              <div><p className="text-[10px] uppercase tracking-[.18em] text-white/45">État du lecteur</p><p className="mt-0.5 text-sm font-medium">{selectedDevice ? selectedDevice.DeviceName || "Lecteur Jellyfin" : "Aucun lecteur prêt"}</p></div>
            </div>
            <Button variant="outline" size="icon" onClick={() => void refreshDevices()} aria-label="Actualiser les lecteurs" className="size-12 rounded-2xl border-white/15 bg-white/5"><RefreshCw className="size-4" /></Button>
          </div>
        </div>
        <div className="relative mt-8 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5 text-xs text-white/50"><CircleHelp className="size-4 shrink-0 text-primary" /><span>Les appareils apparaissent ici lorsqu’ils ont une session Jellyfin active et annoncent le contrôle distant.</span></div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.85fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="player-heading" className="overflow-hidden rounded-3xl border border-white/10 bg-[#121820]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
              <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-primary">Télécommande</p><h2 id="player-heading" className="mt-1 text-lg font-semibold">Lecteur Cast</h2></div>
              <button type="button" onClick={() => setActiveView("appareils")} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 hover:bg-white/10"><Cast className="size-4" />{selectedDevice?.DeviceName || "Choisir un appareil"}</button>
            </div>
            <div className="p-5 sm:p-7">
              {selectedDevice ? <>
                <div className="relative flex min-h-52 items-end overflow-hidden rounded-2xl border border-white/10 bg-[#0b1016] p-5 sm:min-h-64 sm:p-7">
                  {playingItem && session ? <><div className="absolute inset-0 opacity-25" style={{ backgroundImage: `linear-gradient(0deg, #080c12 4%, transparent 100%), url("${imageUrl(session.serverUrl, playingItem.Id, "Backdrop", { maxWidth: 1280 })}&api_key=${encodeURIComponent(session.accessToken)}")`, backgroundPosition: "center", backgroundSize: "cover" }} /><div className="relative flex min-w-0 items-end gap-4"><div className="hidden aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/5 sm:block">{playingItem.ImageTags?.Primary ? <img src={`${imageUrl(session.serverUrl, playingItem.Id, "Primary", { maxWidth: 220 })}&api_key=${encodeURIComponent(session.accessToken)}`} alt="" className="size-full object-cover" /> : <Clapperboard className="m-6 size-8 text-white/35" />}</div><div className="min-w-0"><p className="text-xs uppercase tracking-[.18em] text-white/55">{selectedDevice.PlayState?.IsPaused ? "En pause" : "En lecture"}</p><h3 className="mt-2 truncate text-xl font-semibold sm:text-2xl">{playingItem.Name}</h3><p className="mt-1 text-sm text-white/55">{playingItem.ProductionYear || selectedDevice.Client} · {selectedDevice.DeviceName}</p></div></div></> : <div className="relative m-auto max-w-sm text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary"><Tv2 className="size-7" /></span><p className="mt-4 font-medium">Prêt pour votre prochain film</p><p className="mt-1 text-sm text-white/50">Choisissez un titre dans votre bibliothèque pour l’envoyer sur cet appareil.</p></div>}
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-white/50"><span>{formatTicks(position)}</span><span>{duration ? formatTicks(duration) : "--:--"}</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
                <div className="mt-5 flex items-center justify-center gap-3 sm:gap-5">
                  <Button variant="ghost" size="icon" aria-label="Reculer de 30 secondes" onClick={() => void seekBy(-30)} disabled={!selectedDevice.PlayState?.CanSeek} className="size-11 rounded-full text-white/75"><SkipBack className="size-5" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Arrêter" onClick={() => void runCommand(() => sendPlaybackCommand(session!, selectedDevice.Id, "Stop"), "Lecture arrêtée.")} disabled={!selectedDevice.SupportsMediaControl || !playingItem} className="size-11 rounded-full text-white/75"><Square className="size-4 fill-current" /></Button>
                  <Button aria-label={selectedDevice.PlayState?.IsPaused ? "Reprendre" : "Mettre en pause"} onClick={() => void runCommand(() => sendPlaybackCommand(session!, selectedDevice.Id, selectedDevice.PlayState?.IsPaused ? "Unpause" : "Pause"), selectedDevice.PlayState?.IsPaused ? "Lecture reprise." : "Lecture mise en pause.")} disabled={!selectedDevice.SupportsMediaControl || !playingItem} className="size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"><span className="sr-only">{selectedDevice.PlayState?.IsPaused ? "Reprendre" : "Mettre en pause"}</span>{selectedDevice.PlayState?.IsPaused ? <Play className="size-5 fill-current" /> : <Pause className="size-5 fill-current" />}</Button>
                  <Button variant="ghost" size="icon" aria-label="Avancer de 30 secondes" onClick={() => void seekBy(30)} disabled={!selectedDevice.PlayState?.CanSeek} className="size-11 rounded-full text-white/75"><SkipForward className="size-5" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Actualiser le lecteur" onClick={() => void refreshDevices()} className="size-11 rounded-full text-white/75"><RefreshCw className="size-4" /></Button>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/40"><Volume2 className="size-3.5" />Le volume dépend des capacités du lecteur Jellyfin.</div>
              </> : <div className="py-8"><EmptyDevices loading={devicesLoading} error={devicesError?.message} count={controllableDevices.length} onRefresh={() => void refreshDevices()} /></div>}
              {notice ? <p role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{notice}</p> : null}
              {errorMessage ? <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{errorMessage}</p> : null}
            </div>
          </section>

          <section aria-labelledby="library-heading" className="rounded-3xl border border-white/10 bg-[#121820] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-primary">Votre médiathèque</p><h2 id="library-heading" className="mt-1 text-xl font-semibold">À regarder ensuite</h2></div>
              <div className="flex rounded-xl border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Sections Cast">
                <button role="tab" aria-selected={activeView === "appareils"} onClick={() => setActiveView("appareils")} className={`rounded-lg px-3 py-2 text-xs transition ${activeView === "appareils" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>Appareils</button>
                <button role="tab" aria-selected={activeView === "bibliotheque"} onClick={() => setActiveView("bibliotheque")} className={`rounded-lg px-3 py-2 text-xs transition ${activeView === "bibliotheque" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>Bibliothèque</button>
              </div>
            </div>
            {activeView === "appareils" ? <div className="mt-5">{devicesLoading ? <div className="flex items-center gap-2 py-8 text-sm text-white/50"><Loader2 className="size-4 animate-spin" />Recherche des lecteurs Jellyfin…</div> : devicesError ? <p className="py-5 text-sm text-white/55">Lecteurs indisponibles : {devicesError.message}</p> : controllableDevices.length ? <div className="grid gap-3 sm:grid-cols-2">{controllableDevices.map((device) => <DeviceCard key={device.Id} device={device} selected={device.Id === selectedDevice?.Id} onChoose={() => { setSelectedId(device.Id); setNotice(""); setErrorMessage("") }} />)}</div> : <EmptyDevices loading={false} error={devicesError?.message} count={0} onRefresh={() => void refreshDevices()} />}</div> : <div className="mt-5">{itemsLoading ? <div className="flex items-center gap-2 py-8 text-sm text-white/50"><Loader2 className="size-4 animate-spin" />Chargement de votre bibliothèque…</div> : items?.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.slice(0, 12).map((item) => <MediaTile key={item.Id} item={item} session={session!} loading={busyItem === item.Id} disabled={!selectedDevice} onPlay={() => void playOnDevice(item, "PlayNow")} onQueue={() => void playOnDevice(item, "PlayNext")} />)}</div> : <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">Aucun média récent à afficher.</div>}</div>}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section aria-labelledby="devices-title" className="rounded-3xl border border-white/10 bg-[#121820] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-primary">Connexion</p><h2 id="devices-title" className="mt-1 text-lg font-semibold">Appareils disponibles</h2></div><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/65">{controllableDevices.length} en ligne</span></div>
            <div className="mt-4 flex flex-col gap-2">{devicesLoading ? <div className="flex items-center gap-2 py-5 text-sm text-white/50"><Loader2 className="size-4 animate-spin" />Détection des sessions…</div> : controllableDevices.length ? controllableDevices.map((device) => <DeviceCard key={device.Id} device={device} selected={device.Id === selectedDevice?.Id} onChoose={() => { setSelectedId(device.Id); setNotice(""); setErrorMessage("") }} compact />) : <EmptyDevices loading={false} error={devicesError?.message} count={0} onRefresh={() => void refreshDevices()} />}</div>
            <div className="mt-5 rounded-2xl bg-white/[.035] p-4"><div className="flex items-center gap-2 text-xs font-medium text-white/80"><Smartphone className="size-4 text-primary" />Comment connecter un lecteur ?</div><p className="mt-2 text-xs leading-5 text-white/50">Ouvrez Jellyfin sur votre télé ou appareil Cast et connectez-vous au même serveur. Les lecteurs Jellyfin visibles et contrôlables apparaîtront automatiquement.</p></div>
          </section>
          <section aria-labelledby="queue-title" className="rounded-3xl border border-white/10 bg-[#121820] p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-primary">À venir</p><h2 id="queue-title" className="mt-1 text-lg font-semibold">Lecture suivante</h2></div><Clapperboard className="size-5 text-white/35" /></div>
            {playingItem ? <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Play className="size-4 fill-current" /></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-white/45">En cours sur {selectedDevice?.DeviceName}</p><p className="truncate text-sm font-medium">{playingItem.Name}</p></div></div> : <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-5 text-center"><p className="text-sm font-medium">Votre file est prête</p><p className="mt-1 text-xs text-white/45">Ajoutez des films depuis la bibliothèque.</p></div>}
            <p className="mt-4 text-xs leading-5 text-white/40">L’ajout à la suite utilise la commande PlayNext de Jellyfin. La file est gérée par le lecteur et le serveur.</p>
          </section>
          <section className="rounded-3xl border border-primary/20 bg-primary/[.06] p-5"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Speaker className="size-5" /></span><div><p className="text-sm font-semibold">Contrôle en temps réel</p><p className="text-xs text-white/50">Sessions actualisées toutes les 8 secondes</p></div></div><p className="mt-3 text-xs leading-5 text-white/50">Le navigateur ne découvre pas directement les récepteurs Google Cast. Cette page pilote les clients Jellyfin déclarés dans les sessions du serveur et ne simule pas une connexion Chromecast native.</p></section>
        </aside>
      </div>
    </div>
  </main>
}

function DeviceCard({ device, selected, onChoose, compact = false }: { device: JellyfinPlaybackSession; selected: boolean; onChoose: () => void; compact?: boolean }) {
  const hasMedia = Boolean(device.NowPlayingItem)
  return <button type="button" onClick={onChoose} aria-pressed={selected} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? "border-primary/50 bg-primary/[.08]" : "border-white/10 bg-white/[.025] hover:bg-white/[.06]"}`}>
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-primary/15 text-primary" : "bg-white/5 text-white/55"}`}>{device.Client.toLowerCase().includes("tv") ? <Tv2 className="size-5" /> : <Monitor className="size-5" />}</span>
    <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-medium">{device.DeviceName || "Lecteur Jellyfin"}</span>{selected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}</span><span className="mt-1 block truncate text-xs text-white/45">{device.Client}{hasMedia ? ` · ${device.NowPlayingItem?.Name}` : " · Prêt à lire"}</span>{!compact && <span className="mt-1 block text-[10px] text-white/35">{device.SupportsMediaControl ? "Commandes prises en charge" : "Commandes limitées"}</span>}</span>
  </button>
}

function MediaTile({ item, session, loading, disabled, onPlay, onQueue }: { item: BaseItem; session: NonNullable<ReturnType<typeof useJellyfin>["session"]>; loading: boolean; disabled: boolean; onPlay: () => void; onQueue: () => void }) {
  const poster = item.ImageTags?.Primary ? `${imageUrl(session.serverUrl, item.Id, "Primary", { maxWidth: 320 })}&api_key=${encodeURIComponent(session.accessToken)}` : ""
  return <article className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] transition hover:border-white/20 hover:bg-white/[.05]">
    <div className="relative aspect-[2/3] overflow-hidden bg-[#0b1016]">{poster ? <img src={poster} alt={item.Name} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : <div className="flex size-full items-center justify-center text-white/30"><Clapperboard className="size-8" /></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" /><span className="absolute bottom-3 left-3 right-3 truncate text-sm font-semibold">{item.Name}</span>{loading ? <span className="absolute inset-0 grid place-items-center bg-black/55"><Loader2 className="size-6 animate-spin" /></span> : null}</div>
    <div className="flex gap-2 p-2"><Button size="sm" onClick={onPlay} disabled={disabled || loading} className="min-w-0 flex-1 gap-1.5 text-xs"><Play className="size-3.5 fill-current" />Lire</Button><Button size="icon" variant="outline" onClick={onQueue} disabled={disabled || loading} aria-label={`Lire ${item.Name} ensuite`} className="size-9 shrink-0 border-white/10"><span className="text-base leading-none">+</span></Button></div>
  </article>
}

function EmptyDevices({ loading, error, count, onRefresh }: { loading: boolean; error?: string; count: number; onRefresh: () => void }) {
  if (count > 0) return null
  return <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center"><div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white/5 text-white/45"><Cast className="size-5" /></div><p className="mt-3 text-sm font-medium">{loading ? "Recherche des lecteurs…" : "Aucun lecteur Jellyfin détecté"}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-white/45">{error ? `La connexion aux sessions a échoué : ${error}` : "Un appareil doit être connecté à votre serveur avec un client Jellyfin et autoriser le contrôle distant."}</p><Button variant="outline" size="sm" onClick={onRefresh} className="mt-4 border-white/10"><RefreshCw className="size-3.5" />Actualiser</Button></div>
}

function formatTicks(ticks: number) {
  const total = Math.floor(ticks / tickSeconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
