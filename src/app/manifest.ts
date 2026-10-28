import type { MetadataRoute } from "next";

/** Installable on the home screen: the app opens full screen, like a native one. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guitar Coach",
    short_name: "Allenatore",
    description: "Chitarra acustica, un accordo alla volta",
    start_url: "/path",
    display: "standalone",
    background_color: "#eef2ef",
    theme_color: "#1f6b57",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
