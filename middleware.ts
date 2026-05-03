import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { UserRole } from "@/lib/types"

const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/admin": ["admin"],
  "/superviseur": ["admin", "superviseur"],
  "/caissier": ["admin", "caissier"],
  "/borne": ["admin", "borne"],
}

async function verifySignedRole(value: string): Promise<UserRole | null> {
  const secret = process.env.COOKIE_SECRET
  if (!secret) {
    // No secret configured — accept plain role cookie (dev fallback)
    return (value as UserRole) || null
  }
  const lastDot = value.lastIndexOf(".")
  if (lastDot < 0) return null
  const role = value.slice(0, lastDot)
  const sigHex = value.slice(lastDot + 1)
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(role))
    return valid ? (role as UserRole) : null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessionCookie = request.cookies.get("__session")?.value
  const rawRole = request.cookies.get("__role")?.value ?? ""
  const roleCookie = rawRole ? await verifySignedRole(rawRole) : null

  if (pathname === "/login") {
    if (sessionCookie && roleCookie) {
      const destination = roleToHome(roleCookie)
      return NextResponse.redirect(new URL(destination, request.url))
    }
    return NextResponse.next()
  }

  const requiredRoles = matchProtectedRoute(pathname)
  if (!requiredRoles) return NextResponse.next()

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (roleCookie && !requiredRoles.includes(roleCookie)) {
    return NextResponse.redirect(new URL(roleToHome(roleCookie), request.url))
  }

  return NextResponse.next()
}

function matchProtectedRoute(pathname: string): UserRole[] | null {
  for (const [prefix, roles] of Object.entries(ROUTE_ROLES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return roles
    }
  }
  return null
}

function roleToHome(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin"
    case "superviseur":
      return "/superviseur"
    case "caissier":
      return "/caissier"
    case "borne":
      return "/borne"
    default:
      return "/"
  }
}

export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/superviseur/:path*",
    "/caissier/:path*",
    "/borne/:path*",
  ],
}
