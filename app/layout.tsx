import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vita • Gestão financeira da saúde",
  description: "Finanças, documentos e contabilidade em um só lugar.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}

