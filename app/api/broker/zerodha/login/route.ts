import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/authorize";
import { getBrokerAdapter } from "@/lib/brokers";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!(await can("investments", "connect", supabase))) {
    return NextResponse.redirect(new URL("/investments?broker_error=You+don%27t+have+permission+to+connect+a+broker.", request.url));
  }

  try {
    const loginUrl = getBrokerAdapter("zerodha").getLoginUrl();
    return NextResponse.redirect(loginUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Zerodha isn't configured.";
    return NextResponse.redirect(new URL(`/investments?broker_error=${encodeURIComponent(message)}`, request.url));
  }
}
