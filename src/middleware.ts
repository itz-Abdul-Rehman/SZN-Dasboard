import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes each role is allowed to visit (admin bypasses all checks)
const ROLE_ROUTES: Record<string, string[]> = {
  closer: ["/dashboard", "/dashboard/call-logs", "/dashboard/lead-tagging", "/dashboard/leaderboard"],
  setter: ["/dashboard", "/dashboard/setter"],
  client: ["/dashboard"],
};

function isAllowed(role: string, pathname: string): boolean {
  if (role === "admin") return true;
  const allowed = ROLE_ROUTES[role] ?? [];
  return allowed.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Redirect unauthenticated users to login
  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from login
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Role-based route protection for authenticated users
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "admin"; // default to admin if no profile (owner account)

    if (!isAllowed(role, pathname)) {
      // Redirect to the highest-access page allowed for this role
      const fallback = ROLE_ROUTES[role]?.[0] ?? "/dashboard";
      return NextResponse.redirect(new URL(fallback, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
