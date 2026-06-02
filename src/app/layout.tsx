import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Sans_3, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { AppToaster } from "@/components/ui/toaster";

const instrumentSansHeading = Instrument_Sans({subsets:['latin'],variable:'--font-heading'});

const sourceSans3 = Source_Sans_3({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ticqex",
  description: "Agent-first support platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full overflow-hidden antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
        sourceSans3.variable,
        instrumentSansHeading.variable,
      )}
    >
      <body className="flex h-full flex-col overflow-hidden">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            storageKey="ticqex-theme"
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </QueryProvider>
        <AppToaster />
      </body>
    </html>
  );
}
