import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 60;

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Kailangan ng email at password." },
      { status: 400 }
    );
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const lockoutSince = new Date(
    Date.now() - LOCKOUT_MINUTES * 60 * 1000
  ).toISOString();

  const { data: recentAttempts, error: fetchError } = await supabaseAdmin
    .from("login_attempts")
    .select("id, success, created_at")
    .eq("identifier", normalizedEmail)
    .gte("created_at", lockoutSince)
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("login_attempts fetch error", fetchError);
    return NextResponse.json(
      { error: "Server error, subukan ulit." },
      { status: 500 }
    );
  }

  const failuresSinceLastSuccess: typeof recentAttempts = [];
  for (const attempt of recentAttempts ?? []) {
    if (attempt.success) break;
    failuresSinceLastSuccess.push(attempt);
  }

  if (failuresSinceLastSuccess.length >= MAX_ATTEMPTS) {
    const oldestFailure =
      failuresSinceLastSuccess[failuresSinceLastSuccess.length - 1];
    const unlockAt = new Date(
      new Date(oldestFailure.created_at).getTime() +
        LOCKOUT_MINUTES * 60 * 1000
    );
    const minutesLeft = Math.max(
      1,
      Math.ceil((unlockAt.getTime() - Date.now()) / 60000)
    );
    return NextResponse.json(
      {
        error: `Masyadong maraming maling attempt. Subukan ulit pagkalipas ng ${minutesLeft} minuto.`,
      },
      { status: 429 }
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  await supabaseAdmin.from("login_attempts").insert({
    identifier: normalizedEmail,
    success: !signInError,
  });

  if (signInError) {
    const attemptsLeft = MAX_ATTEMPTS - (failuresSinceLastSuccess.length + 1);
    return NextResponse.json(
      {
        error:
          attemptsLeft > 0
            ? `Maling email o password. ${attemptsLeft} attempt(s) na lang bago mag-lockout.`
            : `Maling email o password. Ma-lo-lock out ka na sa susunod na maling attempt.`,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
