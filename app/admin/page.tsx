"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminView from "@/components/admin-view"
import { useJellyfin } from "@/components/jellyfin-provider"

export default function AdminPage() {
  const { session, ready } = useJellyfin()
  const router = useRouter()
  useEffect(() => { if (ready && !session) router.replace("/login") }, [ready, session, router])
  if (!ready || !session) return <div className="min-h-dvh bg-[#080808]" />
  return <AdminView />
}
