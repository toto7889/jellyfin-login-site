"use client"

import { useState } from "react"
import { Check, KeyRound, Loader2, Monitor } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"
import { authorizeQuickConnect } from "@/lib/jellyfin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function QuickConnectApproval() {
  const { session } = useJellyfin()
  const [code, setCode] = useState("")
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function approve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !code.trim()) return
    setWorking(true)
    setMessage("")
    setError("")
    try {
      await authorizeQuickConnect(session, code.trim().toUpperCase())
      setMessage("Appareil autorisé. Le mobile va terminer sa connexion.")
      setCode("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Code invalide ou expiré.")
    } finally {
      setWorking(false)
    }
  }

  return <section className="glass-panel mt-5 p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-200/10 text-cyan-200"><Monitor className="size-5" /></span><div><h2 className="font-semibold">Activer un appareil mobile</h2><p className="mt-1 text-sm text-white/50">Saisissez le code affiché sur le téléphone à activer. Cette opération utilise Quick Connect de Jellyfin.</p></div></div><form onSubmit={approve} className="mt-5 flex flex-col gap-3 sm:flex-row"><Input aria-label="Code affiché sur le mobile" autoComplete="one-time-code" autoCapitalize="characters" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Code affiché sur le mobile" required className="h-11 border-white/15 bg-white/[.06] font-mono uppercase tracking-widest text-white placeholder:normal-case placeholder:tracking-normal" /><Button type="submit" disabled={working || !session} className="h-11"><KeyRound data-icon="inline-start" />{working ? <><Loader2 className="size-4 animate-spin" />Vérification…</> : "Autoriser l’appareil"}</Button></form>{message ? <p role="status" className="mt-3 flex items-center gap-2 text-sm text-emerald-200"><Check className="size-4" />{message}</p> : null}{error ? <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p> : null}</section>
}
