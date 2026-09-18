"use client"

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
  if (!items.length) return null
  const isWide = variant === "wide"

  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-4 text-lg font-semibold sm:px-6">{title}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 sm:px-6">
        {items.map((item) => (
          <div
            key={item.Id}
            className={isWide ? "w-60 shrink-0 sm:w-72" : "w-32 shrink-0 sm:w-40"}
          >
            <MediaCard item={item} session={session} variant={variant} />
          </div>
        ))}
      </div>
    </section>
  )
}
