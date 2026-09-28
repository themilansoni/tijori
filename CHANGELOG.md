# Changelog

Tracks what changed in each Android APK build. `versionCode`/`versionName` live in
[`android/app/build.gradle`](android/app/build.gradle) — bump both whenever a new APK is built:
`versionCode` by 1, `versionName` by semver (patch for fixes, minor for features).

## 2.0.0 (versionCode 6) — 2026-09-28

Biggest release yet — several new modules and a big FIRE/Dashboard overhaul, built up over
several web-only sessions and now bundled into one APK.

**New: Loans module** — track multiple loans (interest rate, outstanding balance, EMI, tenure,
pending EMIs). Link an expense to a loan and its EMI automatically comes off the outstanding
balance and counts toward EMIs paid.

**New: Reports** — income/expense/savings-rate summary, budget health, and "FIRE Insights": your
saved plan vs. what you're actually saving, with concrete suggestions ("you're ₹X short of your
planned monthly investment — that puts FI at age Y instead of Z", "trimming your top expense
category by 10% frees up ₹W/month").

**New: SMS auto-capture** (Settings) — reads UPI/card debit and credit alerts from your SMS inbox
and auto-logs them as transactions. Off by default; needs the SMS permission granted on first
enable. Only runs while the app is open, not in the background.

**Gold investments** — no longer forces entering grams and a price-per-gram; enter a total
invested/current value directly, with grams as an optional reference field.

**FIRE calculator, made interactive** — 7 live sliders (age, target age, expenses, monthly
investment, return, inflation, SWR) recompute everything instantly, no save required to explore.
Deducts outstanding loans from the corpus. The chart is now zoomed to the years that matter (not
a 60-year run with the answer squished at the start) with a labeled marker at your FI age, and
fixed Y-axis labels that used to get clipped.

**Household split** — tag expenses/budgets with a household member, see per-person breakdowns on
Expenses and Budgets.

**Net Worth** — one number (cash + investments − loans) on the Dashboard hero instead of scattered
across pages, with an automatic monthly trend chart.

**Recurring transactions** — set up rent/subscriptions/salary once (Settings), they log themselves
every month going forward.

**Data export** — full JSON backup plus CSV exports for transactions/investments/loans.

**CSV bank statement import** — upload a statement, it auto-detects Date/Amount or Debit/Credit
columns and previews before importing.

**PIN app lock** — optional 4-6 digit PIN gate, re-prompts whenever the app is reopened or comes
back from the background.

**Dashboard simplified** — cut the itemized lists and duplicate breakdowns (now live on Reports/
Budgets/Accounts/Investments); Recent Transactions trimmed to 3; added live price auto-refresh
badges and a ticking clock.

## 1.2.1 (versionCode 5) — 2026-09-18

- "Add investment" now asks for the type first — the search field (equity, mutual
  fund) and every other field only appear after a type is picked

## 1.2.0 (versionCode 4) — 2026-09-18

- Investments table now groups holdings by category, collapsed by default — click a
  group to expand it. Equity, ETF, and mutual fund holdings are clubbed into one
  "Equity & Funds" group; every other asset type gets its own group.

## 1.1.1 (versionCode 3) — 2026-09-16

- Added "Made by @themilansoni" attribution to the auth screens and app nav footer

## 1.1.0 (versionCode 2) — 2026-09-15

First tracked release. Bundles everything built since the Android wrapper was added:

- Mutual fund search with live NAV auto-fill (mirrors the existing equity/ETF flow)
- Live equity/ETF price fetch and auto-fill via NSE symbol/ISIN search
- Household member tracking with per-person and combined net worth
- FIRE calculator with an investments-only vs. net-worth toggle
- New investment types: gold, FD, RD, PF, PPF, real estate, other
- Assorted fixes: credit card balances no longer leak into current balance, corrected
  Tata Motors demerger data, resolved stale browser caching of the equity search dataset

## 1.0 (versionCode 1)

Initial Android wrapper (Capacitor) around the Tijori PWA.
