/**
 * Ethics Dashboard ?섏씠吏
 * 
 * ?ㅻ━ ?먮떒 ?듦퀎 諛?理쒓렐 寃곗젙 ?댁뿭 ?쒖떆
 */

import React, { useState, useEffect, useRef } from "react";
import { loadEthicsStats } from "@/lib/ethics/ethicsStats";
import { EthicsSummaryCards } from "@/components/ethics/EthicsSummaryCards";
import { EthicsDecisionTable } from "@/components/ethics/EthicsDecisionTable";
import { DailyImpactCard } from "@/components/ethics/DailyImpactCard";
import { useAuth } from "@/context/AuthProvider";
import { requestExecutiveReport } from "@/lib/reports/requestExecutiveReport";

export function EthicsDashboardPage() {
  const { user } = useAuth();
  // TODO: ?ㅼ젣 tenantId/associationId 媛?몄삤湲?  const tenantId = "assoc-nowon-football"; // ?꾩떆 (?ㅼ젣濡쒕뒗 useParams ?먮뒗 context?먯꽌)
  // TODO: ?ㅼ젣 沅뚰븳 泥댄겕濡?援먯껜 (useIsAssociationAdmin ??
  const role: "admin" | "editor" | "viewer" = "admin"; // ?꾩떆

  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    cancelledRef.current = false;
    setLoading(true);
    
    loadEthicsStats(tenantId)
      .then((data) => {
        if (!cancelledRef.current) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Ethics stats 濡쒕뱶 ?ㅽ뙣:", error);
        if (!cancelledRef.current) {
          setStats(null);
          setLoading(false);
        }
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [tenantId]);

  if (role !== "admin") {
    return <div style={{ padding: 16 }}>愿由ъ옄留??묎렐 媛?ν빀?덈떎.</div>;
  }

  if (loading) return <div style={{ padding: 16 }}>濡쒕뵫 以?..</div>;

  if (!stats) return <div style={{ padding: 16 }}>?듦퀎瑜?遺덈윭?????놁뒿?덈떎.</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Ethics Dashboard</h2>
        <button
          onClick={handleGenerateReport}
          disabled={generatingReport}
          style={{
            padding: '10px 20px',
            background: generatingReport ? '#ccc' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: generatingReport ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {generatingReport ? '생성 중...' : '경영 리포트(PDF) 생성'}
        </button>
      </div>

      <EthicsSummaryCards stats={stats} />

      <div style={{ marginTop: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Score Distribution</h3>
        <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8 }}>
          <pre style={{ margin: 0, fontSize: 14 }}>
            {JSON.stringify(stats.scoreBuckets, null, 2)}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Top Block / Review Reasons</h3>
        <ul style={{ listStyle: "disc", paddingLeft: 24 }}>
          {stats.topReasons.length === 0 ? (
            <li style={{ opacity: 0.6 }}>李⑤떒/寃???ъ쑀 ?놁쓬</li>
          ) : (
            stats.topReasons.map(([r, c]: [string, number]) => (
              <li key={r} style={{ marginBottom: 8 }}>
                <b>{r}</b> ??{c}??              </li>
            ))
          )}
        </ul>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Recent Decisions</h3>
        <EthicsDecisionTable tenantId={tenantId} />
      </div>

      {/* ???쇨컙 Impact 由ы룷??*/}
      <DailyImpactCard tenantId={tenantId} />
    </div>
  );
}




