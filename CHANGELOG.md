# Changelog

Tracks what changed in each Android APK build. `versionCode`/`versionName` live in
[`android/app/build.gradle`](android/app/build.gradle) — bump both whenever a new APK is built:
`versionCode` by 1, `versionName` by semver (patch for fixes, minor for features).

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
