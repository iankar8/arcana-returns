import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arcana Labs — Agent Fraud Prevention for Returns",
  description: "Merchants deploying ChatGPT checkout and agent-initiated transactions see returns fraud spike 30-50%. We prevent that before it hits your P&L.",
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
