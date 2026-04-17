import type { PropsWithChildren } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="page-content">{children}</main>
        <Footer />
      </div>
    </div>
  );
}