"use client"

import Link from "next/link"
import { Play } from "lucide-react"
import {
  type BaseItem,
  primaryImage,
  type JellyfinSession,
} from "@/lib/jellyfin"

type MediaCardProps = {
  item: BaseItem
  session: JellyfinSession
  variant?: "poster" | "wide"
}

export function MediaCard({ item, session, variant = "poster" }: MediaCardProps) {
  const isWide = variant === "wide"
  const img = primaryImage(session.serverUrl, item, isWide ? 500 : 320)
  const progress = item.UserData?.PlayedPercentage ?? 0

  const subtitle =
    item.Type === "Episode"
      ? `${item.SeriesName ?? ""}${
          item.ParentIndexNumber != null && item.IndexNumber != null
            ? ` · S${item.ParentIndexNumber}:E${item.IndexNumber}`
            : ""
        }`
      : item.ProductionYear
        ? String(item.ProductionYear)
        : item.Type === "Series"
          ? "Série"
          : ""

  return (
    <Link
      href={`/item/${item.Id}`}
      className="group netflix-hover flex flex-col gap-2 outline-none"
    >
      <div
        className={`relative overflow-hidden rounded-lg border border-border bg-secondary transition-all group-hover:border-primary/60 group-focus-visible:ring-2 group-focus-visible:ring-ring ${
          isWide ? "aspect-video" : "aspect-[2/3]"
        }`}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img || "/placeholder.svg"}
            alt={item.Name}
            crossOrigin="anonymous"
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-sm text-muted-foreground">
            {item.Name}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="jf-gradient flex size-12 items-center justify-center rounded-full shadow-lg">
            <Play className="size-5 fill-white text-white" />
          </span>
        </div>

        {progress > 0 && progress < 100 ? (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-background/60">
            <div
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {item.Name}
        </p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </Link>
  )
}
