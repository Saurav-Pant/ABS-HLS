import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import { cn } from "../lib/utils"
import { Providers } from "../components/Providers";
import { Toaster } from "../components/ui/toaster";
import Navbar from "../components/Navbar";
import 'video.js/dist/video-js.css'

export const metadata: Metadata = {
  title: "HLS ABS",
  description: "HLS ABS",
};

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-cover bg-center antialiased",
          poppins.className,
        )}
      >
        <Providers>
        <Navbar />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
