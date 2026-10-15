import "./globals.css";
import AppShell from "@/components/AppShell";
import ToastProvider from "@/components/ToastProvider";
import { auth } from "@/auth";

export const metadata = {
  title: "MiniPay",
  description: "MiniPay wallet dashboard",
};

export default async function RootLayout({ children }) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AppShell user={session?.user ?? null}>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}