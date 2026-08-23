import type { Metadata } from "next";
import { cairo } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "تِذكار - دعوة تبقى بالذكرى",
  description: "صمّم دعوتك الإلكترونية، خصص تفاصيلها، شاركها ويا أحبابك وتابع تأكيد حضورهم بكل سهولة.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} font-cairo antialiased h-full selection:bg-primary/20 selection:text-primary`}>
      <body className="min-h-full flex flex-col bg-[#FAF8F3] text-[#1C1C1C]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
