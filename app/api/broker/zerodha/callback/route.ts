import { NextRequest, NextResponse } from "next/server";
import { completeBrokerConnection } from "@/lib/actions/broker";

export async function GET(request: NextRequest) {
  const requestToken = request.nextUrl.searchParams.get("request_token");
  const status = request.nextUrl.searchParams.get("status");

  if (status !== "success" || !requestToken) {
    return NextResponse.redirect(
      new URL("/investments?broker_error=Login+was+cancelled+or+failed.", request.url)
    );
  }

  const result = await completeBrokerConnection("zerodha", requestToken);

  if ("error" in result) {
    return NextResponse.redirect(
      new URL(`/investments?broker_error=${encodeURIComponent(result.error)}`, request.url)
    );
  }

  return NextResponse.redirect(
    new URL(`/investments?broker_connected=1&synced=${result.holdingsSynced}`, request.url)
  );
}
