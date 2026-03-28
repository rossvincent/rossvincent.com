import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
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
    <html
      lang="en"
      className={`${plusJakarta.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* NAV */}
        <nav className="sticky top-0 z-50 bg-white/92 backdrop-blur-[12px] border-b border-border">
          <div className="mx-auto max-w-[1120px] px-[clamp(1.25rem,4vw,3rem)] py-3.5 flex items-center justify-between">
            <Link
              href="/"
              className="font-semibold text-[1.05rem] text-ink tracking-[-0.01em] no-underline"
            >
              Ross Vincent
            </Link>
            <div className="flex items-center gap-7">
              <Link
                href="/#services"
                className="text-[0.9rem] text-muted font-medium no-underline hover:text-ink transition-colors"
              >
                Services
              </Link>
              <Link
                href="/#about"
                className="text-[0.9rem] text-muted font-medium no-underline hover:text-ink transition-colors"
              >
                About
              </Link>
              <Link
                href="/scorecard"
                className="text-[0.85rem] font-medium text-white bg-ink px-5 py-2.5 rounded-md no-underline hover:bg-[#333] transition-colors"
              >
                Free AI Assessment →
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>

        {/* FOOTER */}
        <footer className="border-t border-border">
          <div className="mx-auto max-w-[1120px] px-[clamp(1.25rem,4vw,3rem)] py-8 flex items-center justify-between flex-wrap gap-4">
            <p className="text-[0.8rem] text-muted">
              © {new Date().getFullYear()} Ross Vincent. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="mailto:ross@rossvincent.com"
                className="text-[0.8rem] text-muted no-underline hover:text-ink transition-colors"
              >
                ross@rossvincent.com
              </a>
              <a
                href="https://www.linkedin.com/in/rossvincent/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.8rem] text-muted no-underline hover:text-ink transition-colors"
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
