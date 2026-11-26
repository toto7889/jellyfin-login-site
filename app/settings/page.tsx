"use client"

import { useState } from "react"
import useSWR from "swr"
import { Loader2, LogOut, Monitor, Play, RefreshCw, Smartphone, Square, Volume2, X } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { Button } from "@/components/ui/button"
import { getDeviceId, getPlaybackSessions, sendPlaybackCommand, seekPlaybackSession, type JellyfinPlaybackSession } from "@/lib/jellyfin"

export default function SettingsPage() {
  const { session, ready, preferences, updatePreferences, logout } = useJellyfin()
  const [commandError, setCommandError] = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const { data: sessions, error, isLoading, mutate } = useSWR(
    session ? ["playback-sessions", session.userId] : null,
    () => getPlaybackSessions(session!),
    { refreshInterval: 10000, revalidateOnFocus: true },
  )

  async function runCommand(target: JellyfinPlaybackSession, command: "PlayPause" | "Stop") {
    setCommandError(null)
    try {
      await sendPlaybackCommand(session!, target.Id, command)
      await mutate()
    } catch (cause) {
      setCommandError(cause instanceof Error ? cause.message : "La commande Jellyfin a échoué.")
    }
  }

  async function seek(target: JellyfinPlaybackSession, seconds: number) {
    if (!target.PlayState?.CanSeek || target.PlayState.PositionTicks == null) return
    setCommandError(null)
    try {
      await seekPlaybackSession(session!, target.Id, target.PlayState.PositionTicks + seconds * 10_000_000)
      await mutate()
    } catch (cause) {
      setCommandError(cause instanceof Error ? cause.message : "La recherche a échoué.")
    }
  }

  const thisDeviceId = session?.deviceId || (ready ? getDeviceId() : "")
  const mediaSessionAvailable = ready && typeof navigator !== "undefined" && "mediaSession" in navigator
  const fullscreenAvailable = ready && typeof document !== "undefined" && Boolean(document.fullscreenEnabled)

  return <main className="min-h-screen px-4 pb-28 pt-8 text-foreground sm:px-6 sm:py-14 sm:pb-16">
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Paramètres</h1>
      <p className="mt-2 text-sm text-muted-foreground">Appareils, commandes de lecture et préférences du lecteur.</p>

      <section aria-labelledby="devices-heading" className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><h2 id="devices-heading" className="text-lg font-semibold">Appareils Jellyfin</h2><p className="mt-1 text-sm text-muted-foreground">Les appareils connectés sont affichés selon les sessions autorisées par Jellyfin.</p></div>
          <Button variant="outline" size="icon" onClick={() => void mutate()} aria-label="Actualiser les appareils"><RefreshCw /></Button>
        </div>
        <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3"><Monitor className="size-5 text-primary" /><div className="min-w-0"><p className="font-medium">Cet appareil · {preferences.playerDeviceName}</p><p className="truncate text-xs text-muted-foreground">ID Jellyfin : {thisDeviceId || "disponible après connexion"}</p></div></div>
          <p className="mt-3 text-xs text-muted-foreground">Jellyfin identifie cet appareil avec le DeviceId envoyé à l’authentification. Le navigateur ne révèle pas d’identifiant matériel.</p>
        </div>
        {isLoading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Recherche des sessions…</div> : error ? <p role="status" className="py-5 text-sm text-muted-foreground">Sessions indisponibles : {error.message}. Vérifiez l’accès au serveur et ses permissions.</p> : (sessions ?? []).length ? <ul className="mt-4 flex flex-col gap-3">{sessions!.map((target) => {
          const canControl = Boolean(target.SupportsRemoteControl)
          const isThisDevice = target.DeviceId === thisDeviceId
          const position = target.PlayState?.PositionTicks ? Math.floor(target.PlayState.PositionTicks / 10_000_000) : null
          return <li key={target.Id} className="rounded-xl border border-border bg-background/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3"><Smartphone className="mt-0.5 size-5 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="truncate font-medium">{target.DeviceName || "Appareil Jellyfin"}{isThisDevice ? " · cet appareil" : ""}</p><p className="text-xs text-muted-foreground">{target.Client}{target.UserName ? ` · ${target.UserName}` : ""}</p><p className="mt-1 truncate text-sm text-muted-foreground">{target.NowPlayingItem?.Name ?? "Aucune lecture en cours"}{position !== null ? ` · ${Math.floor(position / 60)}:${String(position % 60).padStart(2, "0")}` : ""}</p></div></div>
              <span className={`rounded-full px-2.5 py-1 text-xs ${canControl ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{canControl ? "Contrôle distant disponible" : "Contrôle distant non pris en charge"}</span>
            </div>
            {canControl ? <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => void runCommand(target, "PlayPause")} disabled={!target.SupportsMediaControl}><Play className="size-4" /> Lire / pause</Button><Button size="sm" variant="outline" onClick={() => void seek(target, -10)} disabled={!target.SupportsMediaControl || !target.PlayState?.CanSeek}>−10 s</Button><Button size="sm" variant="outline" onClick={() => void seek(target, 10)} disabled={!target.SupportsMediaControl || !target.PlayState?.CanSeek}>+10 s</Button><Button size="sm" variant="outline" onClick={() => void runCommand(target, "Stop")} disabled={!target.SupportsMediaControl}><Square className="size-4" /> Arrêter</Button></div> : null}
          </li>
        })}</ul> : <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">Aucune autre session visible. L’identification d’un appareil est créée quand il s’authentifie auprès du serveur Jellyfin.</p>}
        {commandError ? <p role="alert" className="mt-3 text-sm text-destructive">{commandError}</p> : null}
      </section>

      <section aria-labelledby="player-heading" className="mt-5 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 id="player-heading" className="text-lg font-semibold">Lecteur et interface</h2>
        <label className="mt-4 block border-b border-border py-3"><span className="text-sm font-semibold">Nom de l’appareil Jellyfin</span><small className="mt-1 block text-xs text-muted-foreground">Ce nom apparaîtra dans les sessions de lecture et la liste des appareils Jellyfin.</small><input type="text" value={preferences.playerDeviceName} maxLength={48} autoComplete="off" onChange={(event) => updatePreferences({ playerDeviceName: event.target.value })} className="mt-3 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary" aria-label="Nom affiché du lecteur Jellyfin" /></label>
        <label className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-3"><span><strong className="text-sm">Lecture automatique</strong><small className="mt-1 block text-xs text-muted-foreground">Lancer la lecture lorsque le flux est prêt</small></span><input type="checkbox" checked={preferences.autoplay} onChange={(event) => updatePreferences({ autoplay: event.target.checked })} className="size-5 accent-primary" /></label>
        <label className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-3"><span><strong className="text-sm">Mode TV</strong><small className="mt-1 block text-xs text-muted-foreground">Cibles plus grandes et focus clavier renforcé pour téléviseur ou télécommande</small></span><input type="checkbox" checked={preferences.tvMode} onChange={(event) => updatePreferences({ tvMode: event.target.checked })} className="size-5 accent-primary" /></label>
        <label className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-3"><span><strong className="text-sm">Réduire les animations</strong><small className="mt-1 block text-xs text-muted-foreground">Limiter les mouvements de l’interface</small></span><input type="checkbox" checked={preferences.reduceMotion} onChange={(event) => updatePreferences({ reduceMotion: event.target.checked })} className="size-5 accent-primary" /></label>
        <div className="grid gap-3 pt-4 text-sm sm:grid-cols-2"><p className="flex items-center gap-2 text-muted-foreground"><Volume2 className="size-4" />Audio : contrôles natifs du navigateur</p><p className="flex items-center gap-2 text-muted-foreground"><Monitor className="size-4" />Plein écran : {fullscreenAvailable ? "pris en charge" : "non disponible"}</p><p className="flex items-center gap-2 text-muted-foreground"><Smartphone className="size-4" />Commandes multimédias : {mediaSessionAvailable ? "API disponible" : "non disponible dans ce navigateur"}</p></div>
      </section>
      <Button variant="outline" onClick={() => setConfirmLogout(true)} className="mt-5 text-destructive">Se déconnecter</Button>
      {confirmLogout ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmLogout(false) }}><section role="alertdialog" aria-modal="true" aria-labelledby="settings-logout-title" className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"><div className="h-1 bg-gradient-to-r from-destructive via-primary to-transparent" /><div className="p-6 sm:p-8"><div className="flex items-start gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><LogOut className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">Session JFLX</p><h2 id="settings-logout-title" className="mt-1 text-xl font-semibold">Quitter votre compte ?</h2><p className="mt-2 text-sm text-muted-foreground">La session de <strong className="text-foreground">{session?.userName ?? "cet utilisateur"}</strong> sera supprimée de cet appareil.</p></div><button type="button" onClick={() => setConfirmLogout(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Fermer"><X className="size-5" /></button></div><div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setConfirmLogout(false)}>Garder ma session</Button><Button variant="destructive" onClick={logout}><LogOut className="size-4" />Se déconnecter</Button></div></div></section></div> : null}
    </div>
  </main>
}
