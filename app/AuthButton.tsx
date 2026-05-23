"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";

const AUTH_COOKIE_NAME = "expense-mail-auth";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const NAV_ITEMS = [
  { href: "/", label: "Trang chủ" },
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/transactions", label: "Giao dịch" },
  { href: "/transactions/import-vietcombank", label: "Import biên lai" },
  { href: "/gmail-sync", label: "Đồng bộ Gmail" }
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  if (href === "/transactions") {
    return (
      pathname === href ||
      (pathname.startsWith("/transactions/") &&
        pathname !== "/transactions/new" &&
        pathname !== "/transactions/import-vietcombank")
    );
  }

  return pathname === href;
}

function saveAuthCookie(email: string) {
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(
    email
  )}; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

export default function AuthButton() {
  const router = useRouter();
  const pathname = usePathname();
  const configError = getSupabaseConfigError();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!configError);
  const [errorMessage, setErrorMessage] = useState(
    configError ? "Chưa cấu hình Supabase Auth." : ""
  );

  useEffect(() => {
    if (configError) {
      return;
    }

    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email ?? null;
      setUserEmail(email);

      if (email) {
        saveAuthCookie(email);
      } else {
        clearAuthCookie();
      }

      setIsLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      const email = session?.user.email ?? null;
      setUserEmail(email);

      if (email) {
        saveAuthCookie(email);
      } else {
        clearAuthCookie();
      }

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configError, router]);

  async function handleLogin() {
    const configError = getSupabaseConfigError();

    if (configError) {
      setErrorMessage("Chưa cấu hình Supabase Auth.");
      return;
    }

    setErrorMessage("");

    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        },
        // Gmail readonly is requested only to search bank receipt emails via OAuth.
        scopes:
          "openid email profile https://www.googleapis.com/auth/gmail.readonly"
      }
    });

    if (error) {
      setErrorMessage("Không thể đăng nhập bằng Google. Vui lòng thử lại.");
    }
  }

  async function handleLogout() {
    setErrorMessage("");
    await getSupabaseClient().auth.signOut();
    clearAuthCookie();
    setUserEmail(null);
    router.push("/");
    router.refresh();
  }

  if (isLoading) {
    return null;
  }

  const emailInitial = userEmail?.trim().charAt(0).toUpperCase() ?? "";

  return (
    <>
      {userEmail ? (
        <>
          <nav
            aria-label="Điều hướng chính"
            className="order-3 -mx-1 flex w-full min-w-0 items-center gap-1.5 overflow-x-auto border-t border-emerald/10 px-1 pt-2 text-sm font-semibold text-ink/65 lg:order-2 lg:mx-0 lg:w-auto lg:flex-1 lg:justify-center lg:overflow-visible lg:border-0 lg:px-0 lg:pt-0"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = isActiveRoute(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-9 items-center whitespace-nowrap rounded-full px-3 text-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald/25 focus:ring-offset-2 ${
                    isActive
                      ? "bg-emerald/10 text-emerald shadow-sm shadow-emerald-900/5"
                      : "hover:bg-emerald/10 hover:text-emerald"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/transactions/new"
              aria-current={pathname === "/transactions/new" ? "page" : undefined}
              className={`flex h-9 items-center whitespace-nowrap rounded-full px-3 text-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald/25 focus:ring-offset-2 ${
                pathname === "/transactions/new"
                  ? "bg-emerald text-white shadow-sm shadow-emerald-700/20"
                  : "bg-emerald/10 text-emerald hover:bg-emerald hover:text-white"
              }`}
            >
              Thêm giao dịch
            </Link>
          </nav>
          <div className="order-2 ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5 lg:order-3 lg:ml-0 lg:w-[238px]">
            <span className="flex h-10 min-w-0 max-w-[150px] items-center gap-2 rounded-full border border-emerald/15 bg-white/80 px-2 text-sm font-semibold text-ink/70 shadow-sm shadow-emerald-900/5 max-lg:max-w-[44px]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-leaf text-xs font-bold text-emerald ring-1 ring-emerald/15">
                {emailInitial}
              </span>
              <span className="hidden min-w-0 truncate lg:block">
                {userEmail}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full border border-emerald/15 bg-white/80 px-4 text-sm font-semibold text-emerald shadow-sm shadow-emerald-900/5 transition duration-200 hover:border-emerald/30 hover:bg-leaf focus:outline-none focus:ring-2 focus:ring-emerald/25 focus:ring-offset-2"
            >
              Đăng xuất
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="order-2 hidden flex-1 lg:block" />
          <div className="order-2 ml-auto flex shrink-0 items-center justify-end lg:order-3 lg:w-[250px]">
            <button
              type="button"
              onClick={handleLogin}
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-emerald to-mint px-4 text-sm font-semibold text-white shadow-md shadow-emerald-700/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-700/25 focus:outline-none focus:ring-2 focus:ring-emerald/30 focus:ring-offset-2"
            >
              Đăng nhập bằng Google
            </button>
          </div>
        </>
      )}

      {errorMessage ? (
        <p className="order-4 w-full rounded-full border border-red-100 bg-white px-3 py-1 text-xs font-medium text-red-600 shadow-sm lg:ml-auto lg:w-auto">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
