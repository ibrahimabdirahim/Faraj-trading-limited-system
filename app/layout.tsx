import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Faraj OS — Business Operating System",
  description: "Business management platform for Faraj Trading Limited",
};

const themeScript = `(function(){try{var t=localStorage.getItem('faraj-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
