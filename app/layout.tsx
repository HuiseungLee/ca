import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "커리어폴리오 | 학생 진로 활동 관리",
  description: "학생의 활동 결과물을 진로 관점으로 분석하고 다음 심화 탐구로 연결합니다.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
