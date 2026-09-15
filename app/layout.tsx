import type { Metadata } from "next";
import { Barlow_Condensed, Figtree } from "next/font/google";
import "./globals.css";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { Header } from "@/components/Header";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TorneosMicro",
  description: "Programación de torneos de microfútbol, calendario, posiciones y goleadores.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${figtree.variable} ${barlow.variable} h-full dark`}>
      <body className="min-h-full flex flex-col antialiased">
        <ConfirmProvider>
          <Header />
          <main className="flex-1">{children}</main>
        </ConfirmProvider>
      </body>
    </html>
  );
}
