import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
