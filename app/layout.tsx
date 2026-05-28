import type { Metadata } from "next";
import Link from "next/link";
import AuthButton from "./AuthButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expense Mail App",
  description: "A simple Vietnamese expense management app MVP."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-paper text-ink">
        <header className="sticky top-0 z-50 border-b border-emerald/10 bg-white/90 shadow-sm shadow-emerald-900/5 backdrop-blur-xl">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-1.5 py-1.5 lg:flex-nowrap lg:py-0">
              <Link
                href="/"
                className="order-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-full pr-2 transition hover:text-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 focus:ring-offset-2 sm:flex-none lg:w-[210px]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald to-mint text-[11px] font-black text-white shadow-md shadow-emerald-700/20">
                  EM
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-bold text-ink sm:text-base">
                    Expense Mail App
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-emerald/80">
                    Quản lý chi tiêu
                  </span>
                </span>
              </Link>

              <AuthButton />
            </div>
          </div>
        </header>

        {children}

        <footer className="border-t border-emerald/10 bg-white/75 px-6 py-6 text-center text-sm text-ink/60 sm:px-8">
          Expense Mail App — MVP quản lý chi tiêu cá nhân
        </footer>
      </body>
    </html>
  );
}
