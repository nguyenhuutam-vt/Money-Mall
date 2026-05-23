import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "expense-mail-auth";
const PROTECTED_PATHS = [
  "/dashboard",
  "/gmail-test",
  "/transactions"
];

export function proxy(request: NextRequest) {
  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  if (request.cookies.has(AUTH_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.search = "?auth=required";

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/gmail-test/:path*", "/transactions/:path*"]
};
