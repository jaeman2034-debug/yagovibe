import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MarketReport_AI from "@/pages/market/MarketReport_AI";

type MarketReportState = {
  product: any;
  analysis: any;
};

export default function MarketReport_AIRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as MarketReportState | null;

  useEffect(() => {
    if (!state) {
      navigate("/app/market", { replace: true });
    }
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  return <MarketReport_AI product={state.product} analysis={state.analysis} />;
}
