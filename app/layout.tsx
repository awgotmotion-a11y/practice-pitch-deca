import type { Metadata } from "next";
import Link from "next/link";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const chakra = Chakra_Petch({ variable: "--font-chakra", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jbm = JetBrains_Mono({ variable: "--font-jbm", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "PitchPrep: DECA-style practice",
  description: "Cluster exams, vocab and a live AI judge that talks back, scored on the 2026-27 DECA forms.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${chakra.variable} ${jbm.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 sm:px-8">
          <Header />
          <main className="w-full flex-1 py-10 sm:py-14">{children}</main>
          <footer className="border-t border-line py-8 text-[13px] text-muted">
            Original practice content. Not affiliated with or endorsed by DECA Inc. DECA is a registered trademark of DECA Inc. ·{" "}
            <Link href="/privacy" className="underline">Privacy</Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
