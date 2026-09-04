import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '小世界｜图文互动体验',
  description: '与个人 Agent 对话，发现、创建并进入属于你的互动小世界。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
