import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tijori — Your money. Organized. Protected.",
    short_name: "Tijori",
    description: "Track expenses, income, budgets, accounts, and investments in one place.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#18181b",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
