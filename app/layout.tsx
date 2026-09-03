import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lyberch — Web Developer & UI Designer",
  description: "Lyberch portfolio — web development and UI design.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}