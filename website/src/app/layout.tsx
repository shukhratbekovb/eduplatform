import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduPlatform — IT-образование нового поколения",
  description:
    "Освой IT-профессию с нуля до трудоустройства. Python, JavaScript, Java, Mobile, DevOps, Data Science и другие направления.",
  keywords: [
    "IT курсы",
    "обучение программированию",
    "Python",
    "JavaScript",
    "IT образование",
    "учебный центр",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
