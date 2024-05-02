import { Lato } from "next/font/google";
import "@/styles/globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
});

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${lato.className} mx-auto min-h-screen w-fit`}>
        {children}
      </body>
    </html>
  );
}
