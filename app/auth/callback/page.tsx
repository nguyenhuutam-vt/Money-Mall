"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";

const AUTH_COOKIE_NAME = "expense-mail-auth";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function saveAuthCookie(email: string) {
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(
    email
  )}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const hasHandledCallback = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function finishLogin() {
      if (hasHandledCallback.current) {
        return;
      }

      hasHandledCallback.current = true;

      const configError = getSupabaseConfigError();

      if (configError) {
        setErrorMessage("Chưa cấu hình Supabase Auth.");
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const code = new URLSearchParams(window.location.search).get("code");
        const { data, error } = code
          ? await supabase.auth.exchangeCodeForSession(code)
          : await supabase.auth.getSession();
        const email = data.session?.user.email;

        if (error || !email) {
          setErrorMessage("Không thể hoàn tất đăng nhập. Vui lòng thử lại.");
          return;
        }

        saveAuthCookie(email);
        router.replace("/");
        router.refresh();
      } catch {
        setErrorMessage("Không thể hoàn tất đăng nhập. Vui lòng thử lại.");
      }
    }

    finishLogin();
  }, [router]);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-16 text-ink">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-emerald/10 bg-white/90 p-8 text-center shadow-2xl shadow-emerald-900/10 backdrop-blur">
        <p className="text-sm font-semibold uppercase text-emerald">
          Supabase Auth
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">
          Đang hoàn tất đăng nhập
        </h1>
        <p className="mt-3 leading-7 text-ink/60">
          Vui lòng đợi trong giây lát.
        </p>

        {errorMessage ? (
          <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
