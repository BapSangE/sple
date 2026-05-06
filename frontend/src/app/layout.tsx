import type { Metadata } from "next";
import { Epilogue, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const epilogue = Epilogue({ 
  subsets: ["latin"], 
  variable: "--font-epilogue",
  weight: ["600", "700"]
});

const beVietnamPro = Be_Vietnam_Pro({ 
  subsets: ["latin"], 
  variable: "--font-be-vietnam-pro",
  weight: ["400", "500", "700"]
});

export const metadata: Metadata = {
  title: "Sple - 나만의 핫플 지도",
  description: "인스타그램 맛집 정보를 지도 하나에",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sple",
  },
};

export const viewport = {
  themeColor: "#FF5A5F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className={`${epilogue.variable} ${beVietnamPro.variable} font-body antialiased h-screen flex flex-col bg-map-bg text-on-surface`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
