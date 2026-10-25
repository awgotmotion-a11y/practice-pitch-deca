import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PitchPrep — DECA-style practice",
  description: "Cluster exam practice, vocab and an AI role-play judge for DECA competitors.",
};

const NAV = [
  ["/", "Dashboard"],
  ["/exam", "Exams"],
  ["/vocab", "Vocab"],
  ["/roleplay", "Role-play"],
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line bg-card">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-bold tracking-tight">
              Pitch<span className="text-accent">Prep</span>{" "}
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">BETA</span>
            </Link>
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="text-sm text-muted hover:text-foreground">
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line px-4 py-4 text-center text-xs text-muted">
          Original practice content. Not affiliated with or endorsed by DECA Inc. DECA is a registered trademark of DECA Inc. ·{" "}
          <Link href="/privacy" className="underline">Privacy</Link>
        </footer>
      </body>
    </html>
  );
}
