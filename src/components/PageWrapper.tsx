import { Outlet } from "react-router-dom";
import { useResponsiveMode } from "@/hooks/useResponsiveMode";

export default function PageWrapper() {
  const mode = useResponsiveMode();

  console.log("PageWrapper Mode:", mode);

  return (
    <div
      className={
        mode === "mobile-portrait"
          ? "mobile-portrait-ui"
          : mode === "mobile-landscape"
          ? "mobile-landscape-ui"
          : mode === "tablet"
          ? "tablet-ui"
          : "pc-center-ui"
      }
    >
      <Outlet />
    </div>
  );
}

