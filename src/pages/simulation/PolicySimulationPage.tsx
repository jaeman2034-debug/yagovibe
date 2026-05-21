/**
 * ?뺤콉 ?쒕??덉씠???섏씠吏
 * 
 * Digital Twin???듯븳 ?뺤콉 蹂寃???寃곌낵 ?덉륫
 */

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { simulateEthicsDecisions } from "@/lib/digitalTwin/simulateEthics";
import { simulateImpact } from "@/lib/digitalTwin/simulateImpact";
import { SimulationResultCards } from "@/components/simulation/SimulationResultCards";
import type { EthicsPolicy } from "@/lib/ethics/scoreEngine";

import { PolicyHistoryDrawer } from "@/components/policy/PolicyHistoryDrawer";
import { writePolicyChange } from "@/lib/policy/policyChangeStore";
import { loadTenantPolicy, saveTenantPolicy } from "@/lib/policy/policyStore";

export function PolicySimulationPage() {
  const { user } = useAuth();
  // TODO: ?ㅼ젣 tenantId/associationId 媛?몄삤湲?  const tenantId = "assoc-nowon-football"; // ?꾩떆 (?ㅼ젣濡쒕뒗 useParams ?먮뒗 context?먯꽌)
  // TODO: ?ㅼ젣 沅뚰븳 泥댄겕濡?援먯껜 (useIsAssociationAdmin ??
  const role: "admin" | "editor" | "viewer" = "admin"; // ?꾩떆

  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any | null>(null);
  const [impact, setImpact] = useState<any | null>(null);
  const [currentPolicy, setCurrentPolicy] = useState<EthicsPolicy | null>(null); // ?꾩옱 ??λ맂 ?뺤콉
  const [openHistory, setOpenHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const [policy, setPolicy] = useState<EthicsPolicy>({
    thresholds: { allow: 80, review: 60 },
    weights: { transparency: 25, accountability: 25, fairness: 25, humanFirst: 25 },
  });

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const loadDecisions = async () => {
      try {
        // ?몃뜳???놁씠???숈옉?섎룄濡??⑥닚 荑쇰━ ?ъ슜
        const q = query(collection(db, "_ethicsDecisions"), where("tenantId", "==", tenantId), limit(200));

        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // ?대씪?댁뼵?몄뿉???뺣젹 (理쒖떊??
        list.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });
        setDecisions(list.slice(0, 100)); // 理쒓렐 100嫄대쭔 ?ъ슜
      } catch (error) {
        console.error("Ethics decisions 濡쒕뱶 ?ㅽ뙣:", error);
        setDecisions([]);
      } finally {
        setLoading(false);
      }
    };

    loadDecisions();
  }, [tenantId]);

  if (role !== "admin") {
    return <div style={{ padding: 16 }}>愿由ъ옄留??묎렐 媛?ν빀?덈떎.</div>;
  }

  const runSimulation = () => {
    if (decisions.length === 0) {
      alert("?쒕??덉씠?섑븷 ?먮떒 湲곕줉???놁뒿?덈떎.");
      return;
    }

    const ethicsResult = simulateEthicsDecisions({
      decisions,
      newPolicy: policy,
    });

    const impactResult = simulateImpact({
      base: { avgApprovalTimeMin: 15, pendingApprovals: 10 },
      ethicsResult,
    });

    setResult(ethicsResult);
    setImpact(impactResult);
  };

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 24 }}>Policy Simulation (Digital Twin)</h2>

      <div style={{ marginBottom: 24, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
        <h3 style={{ marginBottom: 12 }}>?뺤콉 ?ㅼ젙</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Thresholds
            </label>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Allow (??</label>
                <input
                  type="number"
                  value={policy.thresholds.allow}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      thresholds: { ...policy.thresholds, allow: Number(e.target.value) },
                    })
                  }
                  style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Review (??</label>
                <input
                  type="number"
                  value={policy.thresholds.review}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      thresholds: { ...policy.thresholds, review: Number(e.target.value) },
                    })
                  }
                  style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Weights</label>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Transparency</label>
                <input
                  type="number"
                  value={policy.weights.transparency}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      weights: { ...policy.weights, transparency: Number(e.target.value) },
                    })
                  }
                  style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Accountability</label>
                <input
                  type="number"
                  value={policy.weights.accountability}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      weights: { ...policy.weights, accountability: Number(e.target.value) },
                    })
                  }
                  style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Fairness</label>
                <input
                  type="number"
                  value={policy.weights.fairness}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      weights: { ...policy.weights, fairness: Number(e.target.value) },
                    })
                  }
                  style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Human First</label>
                <input
                  type="number"
                  value={policy.weights.humanFirst}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      weights: { ...policy.weights, humanFirst: Number(e.target.value) },
                    })
                  }
                  style={{ width: "100%", padding: 6, border: "1px solid #ddd", borderRadius: 4 }}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading || decisions.length === 0}
          style={{
            marginTop: 16,
            padding: "10px 20px",
            background: loading || decisions.length === 0 ? "#ccc" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loading || decisions.length === 0 ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "濡쒕뵫 以?.." : "?쒕??덉씠???ㅽ뻾"}
        </button>

        {decisions.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
            理쒓렐 {decisions.length}嫄댁쓽 ?먮떒 湲곕줉?쇰줈 ?쒕??덉씠?섑빀?덈떎.
          </div>
        )}
      </div>

      {result && impact && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>?쒕??덉씠??寃곌낵</h3>
          <SimulationResultCards result={result} impact={impact} />

          {result.diffs.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 12 }}>?먮떒 蹂寃??댁뿭 ({result.diffs.length}嫄?</h4>
              <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "2px solid #ddd" }}>
                      <th style={{ padding: 8, textAlign: "left" }}>Audit ID</th>
                      <th style={{ padding: 8, textAlign: "left" }}>From</th>
                      <th style={{ padding: 8, textAlign: "left" }}>To</th>
                      <th style={{ padding: 8, textAlign: "left" }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.diffs.slice(0, 20).map((diff: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 8, fontSize: 12 }}>{diff.auditId.slice(0, 8)}...</td>
                        <td style={{ padding: 8 }}>{diff.from}</td>
                        <td style={{ padding: 8, fontWeight: 600 }}>{diff.to}</td>
                        <td style={{ padding: 8, fontSize: 12 }}>
                          {diff.scoreFrom} ??{diff.scoreTo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {impact.riskScore > 70 && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: "#fee2e2",
                border: "1px solid #ef4444",
                borderRadius: 8,
                color: "#991b1b",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>?좑툘 ?꾪뿕?꾧? ?믪뒿?덈떎</div>
              <div style={{ fontSize: 14 }}>
                Risk Score: {impact.riskScore} (70 珥덇낵)
                <br />
                ?뺤콉 ?곸슜??沅뚯옣?섏? ?딆뒿?덈떎. Threshold??Weight瑜?議곗젙?섏꽭??
              </div>
            </div>
          )}

          {impact.riskScore <= 70 && impact.riskScore > 50 && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: 8,
                color: "#92400e",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>?좑툘 二쇱쓽 ?꾩슂</div>
              <div style={{ fontSize: 14 }}>
                Risk Score: {impact.riskScore} (50-70)
                <br />
                ?뺤콉 ?곸슜 ??紐⑤땲?곕쭅???꾩슂?⑸땲??
              </div>
            </div>
          )}

          {impact.riskScore <= 50 && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: "#d1fae5",
                border: "1px solid #22c55e",
                borderRadius: 8,
                color: "#166534",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>???덉쟾???뺤콉</div>
              <div style={{ fontSize: 14 }}>
                Risk Score: {impact.riskScore} (50 ?댄븯)
                <br />
                ?뺤콉 ?곸슜???덉쟾?⑸땲??
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}




