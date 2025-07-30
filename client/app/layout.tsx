// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignedOut,
  SignedIn,
  SignUp,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import { Bot } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My App",
  description: "AI File Chat Application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
        >
          <SignedOut>
            <div className="flex min-h-screen items-center justify-center">
              <SignUp />
            </div>
          </SignedOut>

          <SignedIn>
            {/* Header */}
            <header className="w-full flex items-center justify-between p-4 bg-white border-b shadow-sm sticky top-0 z-10">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    PDF Chat Assistant
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ask questions about your uploaded documents
                  </p>
                </div>
              </div>
              <UserButton afterSignOutUrl="/" />
            </header>

            {/* Main App */}
            <main>{children}</main>
          </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}
