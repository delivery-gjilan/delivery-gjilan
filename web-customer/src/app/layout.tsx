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
        <html lang="en" className="h-full">
            <body className="min-h-full flex flex-col antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
