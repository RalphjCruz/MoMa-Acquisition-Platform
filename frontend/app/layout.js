import "./globals.css";
import AppProviders from "./components/AppProviders";

export const metadata = {
  title: "MoMA Acquisition Platform",
  description: "Frontend viewer for MoMA acquisition dataset"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
