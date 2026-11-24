"use client"

import { useState } from "react"
import { type BaseItem, type JellyfinSession } from "@/lib/jellyfin"
import { MediaCard } from "@/components/media-card"

type MediaRowProps = {
  title: string
  items: BaseItem[]
  session: JellyfinSession
  variant?: "poster" | "wide"
}

export function MediaRow({
  title,
  items,
  session,
  variant = "poster",
}: MediaRowProps) {
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null)
  if (!items.length) return null
  const isWide = variant === "wide"

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-4 text-lg font-semibold sm:px-6">{title}</h2>
      <div data-previewing={activePreviewId !== null} data-variant={variant} className="media-row-track no-scrollbar flex items-start gap-3 overflow-x-auto px-4 pb-2 sm:px-6">
        {items.map((item) => (
          <div
            key={item.Id}
            data-active={activePreviewId === item.Id}
            data-neighbor={activePreviewId !== null && activePreviewId !== item.Id}
            className={`media-row-card ${isWide ? "media-row-card--wide" : ""}`}
          >
            <MediaCard
              item={item}
              session={session}
              variant={variant}
              onPreviewChange={(active) => setActivePreviewId((current) => active ? item.Id : current === item.Id ? null : current)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
