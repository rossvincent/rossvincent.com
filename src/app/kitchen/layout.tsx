import { Archivo } from "next/font/google";

// One grotesque doing every job, at very different weights and sizes, which
// is how the reference works: the same face carries a 44px headline, a 28px
// figure and a 10px label. Variable, so it is one file rather than a set of
// weights. Not Inter and not Plus Jakarta Sans.
const archivo = Archivo({
  variable: "--kt-sans",
  subsets: ["latin"],
  display: "swap",
});

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <div className={archivo.variable}>{children}</div>;
}
