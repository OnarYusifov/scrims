import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { NavbarConditional } from "@/components/navbar-conditional";
import { GlobalQueueIndicator } from "@/components/global-queue-indicator";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trayb",
  description: "Trayb application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${instrumentSans.variable} antialiased`}>
        <Providers>
          <NavbarConditional />
          {children}
          <GlobalQueueIndicator />
        </Providers>
      </body>
    </html>
  );
}
