import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cinzel",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-montserrat",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const DESCRIPTION =
  "Armoire Bespoke — made-to-measure blazers, jackets, shirts, trousers and ceremonial kurtas, plus ready-made pieces. Where master craft meets timeless elegance.";

export const metadata: Metadata = {
  title: {
    default: "Armoire Bespoke — Tailored to Define You",
    template: "%s · Armoire Bespoke",
  },
  description: DESCRIPTION,
  applicationName: "Armoire Bespoke",
  metadataBase: new URL(SITE_URL),
  keywords: [
    "Armoire Bespoke",
    "bespoke tailoring",
    "made to measure",
    "custom blazer",
    "tailored suit",
    "Dhaka tailor",
    "kurta",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Armoire Bespoke",
    title: "Armoire Bespoke — Tailored to Define You",
    description: DESCRIPTION,
    url: SITE_URL,
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "Armoire Bespoke — Tailored to Define You" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Armoire Bespoke — Tailored to Define You",
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cormorant.variable} ${montserrat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
