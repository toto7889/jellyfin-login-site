import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function isPublicIp(value: string) {
  if (value.includes(":")) return !value.startsWith("fc") && !value.startsWith("fd") && value !== "::1"
  const parts = value.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  return !(a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168))
}

export function GET(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  const candidate = forwarded || realIp || ""
  return NextResponse.json({ ip: isPublicIp(candidate) ? candidate : null, source: candidate ? "proxy" : "unavailable" }, { headers: { "Cache-Control": "no-store" } })
}
