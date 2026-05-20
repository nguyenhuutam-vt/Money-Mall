import type { Metadata } from "next";
import Link from "next/link";
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
        <header className="sticky top-0 z-50 border-b border-emerald/10 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <Link href="/" className="text-lg font-semibold text-ink">
              Expense Mail App
            </Link>

            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink/65">
              <Link
                href="/"
                className="rounded-full px-3 py-2 transition hover:bg-emerald/10 hover:text-emerald"
              >
                Trang chủ
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-2 transition hover:bg-emerald/10 hover:text-emerald"
              >
                Tổng quan
              </Link>
              <Link
                href="/transactions"
                className="rounded-full px-3 py-2 transition hover:bg-emerald/10 hover:text-emerald"
              >
                Giao dịch
              </Link>
              <Link
                href="/transactions/new"
                className="rounded-full px-3 py-2 transition hover:bg-emerald/10 hover:text-emerald"
              >
                Thêm giao dịch
              </Link>
              <Link
                href="/transactions/new"
                className="rounded-full bg-gradient-to-r from-emerald to-mint px-5 py-2.5 text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/30"
              >
                Thêm giao dịch
              </Link>
            </nav>
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
