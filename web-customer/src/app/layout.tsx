import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "Zipp Go — Food & Grocery Delivery",
    description: "Order food and groceries from your favorite local businesses. Fast delivery in Gjilan.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full dark" suppressHydrationWarning>
            <head>
                {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
                <script
                    id="theme-init"
                    // biome-ignore lint: inline theme init must run before paint
                    dangerouslySetInnerHTML={{
                        __html: `try{var s=localStorage.getItem('theme'),r=document.documentElement;if(s==='light'){r.classList.remove('dark')}else{r.classList.add('dark');if(!s)localStorage.setItem('theme','dark')}}catch(_){document.documentElement.classList.add('dark')}`,
                    }}
                />
            </head>
            <body className="min-h-full flex flex-col antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
