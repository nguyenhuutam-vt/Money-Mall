"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";

const AUTH_COOKIE_NAME = "expense-mail-auth";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/transactions", label: "Giao dịch" }
];
const SECONDARY_NAV_ITEMS = [
  { href: "/budgets", label: "Ngân sách" },
  { href: "/transactions/import-vietcombank", label: "Import biên lai" },
  { href: "/gmail-sync", label: "Đồng bộ Gmail" },
  { href: "/settings", label: "Cài đặt" }
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
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!configError);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
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

  useEffect(() => {
    if (!isToolsMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        toolsMenuRef.current &&
        !toolsMenuRef.current.contains(event.target as Node)
      ) {
        setIsToolsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isToolsMenuOpen]);

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
  const isSecondaryRouteActive = SECONDARY_NAV_ITEMS.some((item) =>
    isActiveRoute(pathname, item.href)
  );

  return (
    <>
      {userEmail ? (
        <>
          <nav
            aria-label="Điều hướng chính"
            className="order-3 -mx-1 flex w-full min-w-0 flex-wrap items-center gap-1.5 gap-y-1.5 overflow-visible border-t border-emerald/10 px-1 pt-1.5 text-sm font-semibold text-ink/65 lg:order-2 lg:mx-0 lg:w-auto lg:flex-1 lg:justify-center lg:gap-2 lg:border-0 lg:px-0 lg:pt-0"
          >
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive = isActiveRoute(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsToolsMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-8 items-center whitespace-nowrap rounded-full px-3 text-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald/25 focus:ring-offset-2 ${
                    isActive
                      ? "bg-emerald/10 text-emerald shadow-sm shadow-emerald-900/5"
                      : "hover:bg-emerald/10 hover:text-emerald"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div ref={toolsMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsToolsMenuOpen((isOpen) => !isOpen)}
                aria-expanded={isToolsMenuOpen}
                aria-haspopup="menu"
                className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald/25 focus:ring-offset-2 ${
                  isSecondaryRouteActive
                    ? "bg-emerald/10 text-emerald shadow-sm shadow-emerald-900/5"
                    : "hover:bg-emerald/10 hover:text-emerald"
                }`}
              >
                Công cụ
                <span
                  className={`text-xs transition ${
                    isToolsMenuOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>

              {isToolsMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-emerald/10 bg-white/95 p-1.5 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl lg:left-1/2 lg:right-auto lg:-translate-x-1/2"
                >
                  {SECONDARY_NAV_ITEMS.map((item) => {
                    const isActive = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsToolsMenuOpen(false)}
                        role="menuitem"
                        aria-current={isActive ? "page" : undefined}
                        className={`block rounded-xl px-3 py-2 text-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald/25 ${
                          isActive
                            ? "bg-emerald/10 text-emerald"
                            : "text-ink/70 hover:bg-leaf hover:text-emerald"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <Link
              href="/transactions/new"
              onClick={() => setIsToolsMenuOpen(false)}
              aria-current={pathname === "/transactions/new" ? "page" : undefined}
              className={`flex h-8 items-center whitespace-nowrap rounded-full px-3 text-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald/25 focus:ring-offset-2 ${
                pathname === "/transactions/new"
                  ? "bg-emerald text-white shadow-sm shadow-emerald-700/20"
                  : "border border-emerald/15 bg-emerald/10 text-emerald hover:border-emerald/30 hover:bg-emerald hover:text-white"
              }`}
            >
              Thêm giao dịch
            </Link>
          </nav>
          <div className="order-2 ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5 lg:order-3 lg:ml-0 lg:w-[200px]">
            <span className="flex h-9 min-w-0 max-w-[112px] items-center gap-1.5 rounded-full border border-emerald/15 bg-white/80 px-1.5 text-sm font-semibold text-ink/70 shadow-sm shadow-emerald-900/5 max-lg:max-w-[40px]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf text-[11px] font-bold text-emerald ring-1 ring-emerald/15">
                {emailInitial}
              </span>
              <span className="hidden min-w-0 truncate lg:block">
                {userEmail}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-emerald/15 bg-white/80 px-3 text-sm font-semibold text-emerald shadow-sm shadow-emerald-900/5 transition duration-200 hover:border-emerald/30 hover:bg-leaf focus:outline-none focus:ring-2 focus:ring-emerald/25 focus:ring-offset-2"
            >
              Đăng xuất
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="order-2 hidden flex-1 lg:block" />
          <div className="order-2 ml-auto flex shrink-0 items-center justify-end lg:order-3 lg:w-[230px]">
            <button
              type="button"
              onClick={handleLogin}
              className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-emerald to-mint px-4 text-sm font-semibold text-white shadow-md shadow-emerald-700/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-700/25 focus:outline-none focus:ring-2 focus:ring-emerald/30 focus:ring-offset-2"
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
