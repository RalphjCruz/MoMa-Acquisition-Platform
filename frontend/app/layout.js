import "./globals.css";
import { Cormorant_Garamond } from "next/font/google";
import AppProviders from "./components/AppProviders";
import AppFooter from "./components/AppFooter";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-museum",
  weight: ["400", "500", "600", "700"]
});

export const metadata = {
  title: "MoMAFlow",
  description: "Frontend viewer for MoMA acquisition dataset"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${cormorantGaramond.variable} font-[var(--font-museum)] antialiased`}>
        <AppProviders>
          <div className="app-root flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <AppFooter />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
