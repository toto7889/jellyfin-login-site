import type { Metadata } from "next"
import { AuthGuard } from "@/components/auth-guard"
import { TvGuideView } from "@/components/tv-guide-view"

export const metadata: Metadata = {
  title: "Guide TV",
  description: "Consultez les programmes TV Jellyfin, les chaînes en direct et les horaires à venir.",
}

export default function GuideTvPage() {
  return <AuthGuard><TvGuideView /></AuthGuard>
}
