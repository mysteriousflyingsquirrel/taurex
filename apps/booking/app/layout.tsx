import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taurex Booking",
  description: "Book your vacation rental directly with the host.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="border-t border-border bg-surface py-8">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="text-sm text-muted">
              Powered by{" "}
              <a href="https://taurex.one" className="font-medium text-primary hover:text-primary-hover">
                Taurex
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
