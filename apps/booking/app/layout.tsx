import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taurex Booking",
  description: "Book your vacation rental directly with the host.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
