"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useJellyfin } from "@/components/jellyfin-provider"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, ready } = useJellyfin()
  const router = useRouter()

  useEffect(() => {
    if (ready && !session) router.replace("/login")
  }, [ready, session, router])

  if (!ready || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
