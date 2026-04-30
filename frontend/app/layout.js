import "./globals.css";
import { Sora } from "next/font/google";
import AppProviders from "./components/AppProviders";
import AppFooter from "./components/AppFooter";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora"
});

export const metadata = {
  title: "MoMA Acquisition Platform",
  description: "Frontend viewer for MoMA acquisition dataset"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${sora.variable} font-[var(--font-sora)] antialiased`}>
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
