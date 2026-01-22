import { NextResponse } from "next/server";

export function middleware(req) {
  const res = NextResponse.next();

  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204 });
  }

  return res;
}

export const config = {
  matcher: "/api/:path*",
};
