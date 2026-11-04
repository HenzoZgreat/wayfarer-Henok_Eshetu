import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wayfarer",
  description: "City guide and tour booking web app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
