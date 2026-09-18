"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { LoginForm } from "@/components/login-form"
import { useJellyfin } from "@/components/jellyfin-provider"

export default function LoginPage() {
  const { session, ready } = useJellyfin()
  const router = useRouter()

  useEffect(() => {
    if (ready && session) router.replace("/")
  }, [ready, session, router])

  return <LoginForm />
}
