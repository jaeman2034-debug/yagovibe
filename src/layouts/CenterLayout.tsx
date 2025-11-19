import React from "react";
import { Outlet } from "react-router-dom";

type CenterLayoutProps = {
  children?: React.ReactNode;
};

export default function CenterLayout({ children }: CenterLayoutProps) {
  return (
    <main className="min-h-screen w-full flex justify-center bg-gray-50">
      <div className="w-full max-w-[900px] mx-auto px-4 py-6 min-w-0 bg-red-100">
        {children || <Outlet />}
      </div>
    </main>
  );
}
