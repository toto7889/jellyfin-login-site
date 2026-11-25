import type { Metadata } from "next"
import { AppHeader } from "@/components/app-header"
import { AuthGuard } from "@/components/auth-guard"
import { ResumeView } from "@/components/resume-view"

export const metadata: Metadata = {
  title: "Reprendre la lecture",
  description: "Retrouvez vos films et épisodes Jellyfin en cours de lecture.",
}

export default function ResumePage() {
  return (
    <AuthGuard>
      <AppHeader />
      <ResumeView />
    </AuthGuard>
  )
}
