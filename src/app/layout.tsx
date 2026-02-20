import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Footer } from "@/components/Footer";

const euclid = localFont({
  src: [
    { path: "../../public/fonts/EuclidCircularB-Light.ttf", weight: "300", style: "normal" },
    { path: "../../public/fonts/EuclidCircularB-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/EuclidCircularB-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/EuclidCircularB-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/EuclidCircularB-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-euclid",
});

export const metadata: Metadata = {
  title: "Lo Scalo - Craft Drinks by the Lake",
  description: "Cocktail bar by Lake Como",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${euclid.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
