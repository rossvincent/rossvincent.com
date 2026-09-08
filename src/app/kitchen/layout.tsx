import { Source_Serif_4, JetBrains_Mono } from "next/font/google";

// Two faces with clearly different jobs, per AGENTS.md: a serif that reads,
// and a monospace that holds every figure and annotation. Both are variable,
// so this is two font files rather than a set of weights. Neither is Inter
// or Plus Jakarta Sans.
const serif = Source_Serif_4({
  variable: "--kt-serif",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--kt-mono",
  subsets: ["latin"],
  display: "swap",
});

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${serif.variable} ${mono.variable}`}>{children}</div>;
}
