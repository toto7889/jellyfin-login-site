"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import { useJellyfin } from "@/components/jellyfin-provider"

export default function LoginPage() {
  const { session, ready } = useJellyfin()
  const router = useRouter()

  useEffect(() => {
    if (ready && session) router.replace("/")
  }, [ready, session, router])

  if (session) return null
  if (!ready) {
    return <main className="flex min-h-dvh items-center justify-center" role="status" aria-label="Chargement de la connexion"><Loader2 className="size-6 animate-spin text-muted-foreground" /></main>
  }

  return <LoginForm />
}

