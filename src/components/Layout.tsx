import { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import AmbientBackground from "@/components/three/AmbientBackground";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AmbientBackground />
      <main className="pb-24 min-h-screen max-w-lg mx-auto relative z-10">
        {children}
      </main>
      <AppNav />
    </div>
  );
}
