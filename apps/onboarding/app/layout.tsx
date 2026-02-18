import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taurex – Vacation Rental Management",
  description: "Manage your apartments, accept bookings, and delight your guests — all from one simple platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
