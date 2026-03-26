import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ross Vincent – AI Consulting for Small Businesses",
  description:
    "I help small businesses cut through the AI noise and implement what actually works. Practical AI strategy, automation, and implementation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border">
          <nav className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Ross Vincent
            </Link>
            <div className="flex items-center gap-8 text-sm">
              <Link
                href="/#services"
                className="text-muted hover:text-foreground transition-colors"
              >
                Services
              </Link>
              <Link
                href="/scorecard"
                className="bg-accent text-background px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
              >
                Free AI Assessment
              </Link>
            </div>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border">
          <div className="mx-auto max-w-4xl px-6 py-8 flex flex-col sm:flex-row justify-between gap-4 text-sm text-muted">
            <p>
              &copy; {new Date().getFullYear()} Ross Vincent. All rights
              reserved.
            </p>
            <div className="flex gap-6">
              <a
                href="mailto:ross@rossvincent.com"
                className="hover:text-foreground transition-colors"
              >
                ross@rossvincent.com
              </a>
              <a
                href="https://www.linkedin.com/in/rossvincent/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
