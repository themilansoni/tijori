export type NseEquity = { symbol: string; name: string; series: string; isin: string };

let cache: NseEquity[] | null = null;
let loading: Promise<NseEquity[]> | null = null;

/**
 * NSE's own listing endpoint blocks non-browser requests and Yahoo/NSE APIs
 * don't allow CORS, so this is a static snapshot of NSE-listed equities
 * (symbol/name/ISIN) bundled as a public asset — fetched once, cached in
 * memory, then searched entirely client-side.
 */
async function loadEquities(): Promise<NseEquity[]> {
  if (cache) return cache;
  if (!loading) {
    // Firebase Hosting caches this file for an hour; "no-cache" forces the
    // browser to revalidate with the server (a fast 304 if unchanged) rather
    // than silently reusing a stale copy of the dataset for that whole hour.
    loading = fetch("/data/nse-equities.json", { cache: "no-cache" })
      .then((r) => r.json())
      .then((data: NseEquity[]) => {
        cache = data;
        return data;
      });
  }
  return loading;
}

export async function searchNseEquities(query: string, limit = 8): Promise<NseEquity[]> {
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const equities = await loadEquities();
  const symbolStarts: NseEquity[] = [];
  const nameStarts: NseEquity[] = [];
  const contains: NseEquity[] = [];

  for (const e of equities) {
    const upperName = e.name.toUpperCase();
    if (e.symbol.startsWith(q)) symbolStarts.push(e);
    else if (upperName.startsWith(q)) nameStarts.push(e);
    else if (e.symbol.includes(q) || upperName.includes(q)) contains.push(e);
  }

  return [...symbolStarts, ...nameStarts, ...contains].slice(0, limit);
}
