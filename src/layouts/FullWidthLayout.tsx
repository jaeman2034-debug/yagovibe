import React from "react";
import { Outlet } from "react-router-dom";

type FullWidthLayoutProps = {
  children?: React.ReactNode;
};

export default function FullWidthLayout({ children }: FullWidthLayoutProps) {
  return (
    <main className="min-h-screen w-full bg-gray-50 px-4 py-6">
      <div className="w-full max-w-[1400px] mx-auto">
        {children || <Outlet />}
      </div>
    </main>
  );
}

