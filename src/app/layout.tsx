import type { Metadata, Viewport } from "next";

import { DEFAULT_BRAND_NAME, getConfig } from "@/lib/config";

import "./globals.css";

export function generateMetadata(): Metadata {
  // Build steps and misconfigured deploys must still render a title; the
  // gated pages report the configuration error themselves.
  let brandName = DEFAULT_BRAND_NAME;
  try {
    brandName = getConfig().brandName;
  } catch {
    // fall back to the template default
  }
  return {
    title: {
      default: brandName,
      template: `%s · ${brandName}`,
    },
    description: "Read-only audit window over the ops crew's tickets, documents, and vault metadata.",
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1013" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
