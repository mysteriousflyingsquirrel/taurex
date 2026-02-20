import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taurex – Vacation Rental Management",
  description: "Manage your apartments, accept bookings, and delight your guests — all from one simple platform.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
