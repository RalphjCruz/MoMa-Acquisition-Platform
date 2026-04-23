import "./globals.css";

export const metadata = {
  title: "MoMA Acquisition Platform",
  description: "Frontend viewer for MoMA acquisition dataset"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

