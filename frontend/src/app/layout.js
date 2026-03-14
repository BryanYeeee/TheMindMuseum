import { Lora } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata = {
  title: "The Mind Museum",
  description: "An interactive learning experience",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${lora.variable} font-[family-name:var(--font-lora)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
