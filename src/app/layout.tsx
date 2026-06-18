import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://dash.jennyspeelman.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Edge Impulse · Plotly Dash",
  description:
    "Interactive Plotly time-series dashboard for Edge Impulse projects. Per-channel subplots on a shared timeline, with zoom, pan, a range slider, and PNG export. Standalone or embedded in Edge Impulse Studio.",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Edge Impulse · Plotly Dash",
    title: "Edge Impulse · Plotly Dash",
    description:
      "Interactive Plotly time-series dashboard for Edge Impulse projects. Standalone or embedded in Edge Impulse Studio.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Edge Impulse · Plotly Dash",
    description:
      "Interactive Plotly time-series dashboard for Edge Impulse projects.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
