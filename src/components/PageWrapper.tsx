import { Outlet } from "react-router-dom";
import { useResponsiveMode } from "@/hooks/useResponsiveMode";

export default function PageWrapper() {
  const mode = useResponsiveMode();

  return (
    <div
      className={[
        mode === "mobile-portrait"
          ? "mobile-portrait-ui"
          : mode === "mobile-landscape"
            ? "mobile-landscape-ui"
            : mode === "tablet"
              ? "tablet-ui"
              : "pc-center-ui",
        "w-full min-w-0",
      ].join(" ")}
    >
      <Outlet />
    </div>
  );
}

