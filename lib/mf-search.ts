const MF_PROXY_URL = "https://tijori-price-proxy.vercel.app/api/mf-search";

export type MfScheme = { schemeCode: string; isin: string | null; name: string; nav: number; date: string };

export async function searchMutualFunds(query: string): Promise<MfScheme[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(`${MF_PROXY_URL}?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function lookupMfNav(schemeCode: string): Promise<number | null> {
  try {
    const res = await fetch(`${MF_PROXY_URL}?schemeCode=${encodeURIComponent(schemeCode)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.nav === "number" ? data.nav : null;
  } catch {
    return null;
  }
}
