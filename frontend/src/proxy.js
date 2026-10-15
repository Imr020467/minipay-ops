import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const loggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  if (!loggedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (loggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};