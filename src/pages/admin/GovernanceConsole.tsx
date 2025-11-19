import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Power, RefreshCw, Sparkles, FileText, Save, CheckCircle2, Activity, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type SystemState = {
  disabled: boolean;
  dryRun?: boolean;
};

type AuditLog = {
  at: string;
  actor?: string;
  action?: string;
  decision?: string;
  reason?: string;
  runId?: string;
};

function fmtTime(value?: string | number | Date): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

export default function GovernanceConsole(): JSX.Element {
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<SystemState>({ disabled: false, dryRun: false });
  const [policy, setPolicy] = useState("");
  const [policySavedAt, setPolicySavedAt] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [limit, setLimit] = useState(20);
  const [aiInsight, setAiInsight] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchJSON = useCallback(async <T,>(url: string): Promise<T> => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`${url} ${res.status}`);
    }
    return res.json() as Promise<T>;
  }, []);

  const fetchText = useCallback(async (url: string): Promise<string> => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`${url} ${res.status}`);
    }
    return res.text();
  }, []);

  const loadPolicy = useCallback(async () => {
    const text = await fetchText("/api/policy");
    setPolicy(text);
  }, [fetchText]);

  const loadState = useCallback(async () => {
    const data = await fetchJSON<SystemState>("/api/status");
    setState({
      disabled: Boolean(data.disabled),
      dryRun: Boolean(data.dryRun),
    });
  }, [fetchJSON]);

  const loadAudit = useCallback(async () => {
    const data = await fetchJSON<AuditLog[]>(`/api/audit?limit=${limit}`);
    setAudit(data ?? []);
  }, [fetchJSON, limit]);

  const loadInsight = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/insight");
      if (!res.ok) {
        setAiInsight("");
        return;
      }
      const text = await res.text();
      setAiInsight(text);
    } catch {
      setAiInsight("");
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      await Promise.all([loadPolicy(), loadState(), loadAudit(), loadInsight()]);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "초기화 실패");
    } finally {
      setInitializing(false);
    }
  }, [loadAudit, loadInsight, loadPolicy, loadState]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initializing) {
      loadAudit().catch(() => {
        /* no-op */
      });
    }
  }, [limit, loadAudit, initializing]);

  const toggleKillSwitch = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !state.disabled, dryRun: state.dryRun }),
      });
      await loadState();
    } catch (err: any) {
      alert(`킬스위치 변경 실패: ${err?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  }, [loadState, state.disabled, state.dryRun]);

  const toggleDryRun = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: state.disabled, dryRun: !state.dryRun }),
      });
      await loadState();
    } catch (err: any) {
      alert(`DRY-RUN 변경 실패: ${err?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  }, [loadState, state.disabled, state.dryRun]);

  const savePolicy = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "text/yaml" },
        body: policy,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || res.statusText);
      }
      setPolicySavedAt(new Date().toISOString());
      alert("정책이 저장되었습니다.");
    } catch (err: any) {
      alert(`정책 저장 실패: ${err?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  }, [policy]);

  const refreshAudit = useCallback(() => {
    loadAudit().catch((err: any) => {
      alert(`감사 로그 갱신 실패: ${err?.message ?? err}`);
    });
  }, [loadAudit]);

  const refreshInsight = useCallback(async () => {
    setBusy(true);
    try {
      await loadInsight();
    } catch (err: any) {
      alert(`AI 요약 갱신 실패: ${err?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  }, [loadInsight]);

  const stats = useMemo(
    () => ({
      disabled: state.disabled,
      dryRun: Boolean(state.dryRun),
      auditCount: audit.length,
    }),
    [audit.length, state.disabled, state.dryRun]
  );

  if (initializing) {
    return <p className="p-10 text-muted-foreground">콘솔을 불러오는 중입니다...</p>;
  }

  return (
    <motion.div className="p-6 space-y-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="text-primary" /> AI Governance Console
        </h1>
        <div className="text-xs text-muted-foreground flex flex-col items-end">
          <span>자동화 상태: {stats.disabled ? "중지됨" : "활성"}</span>
          <span>감사 로그: {stats.auditCount}개 표시 중</span>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">초기화 오류</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power /> Kill Switch
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">AI 자동화를 즉시 중단합니다.</div>
            <Switch checked={stats.disabled} onCheckedChange={toggleKillSwitch} disabled={busy} />
          </CardContent>

          <Separator className="my-2" />

          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">DRY-RUN (시뮬레이션)</div>
            <Switch checked={stats.dryRun} onCheckedChange={toggleDryRun} disabled={busy} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles /> AI Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">최근 AI 요약 리포트</p>
              <Button size="sm" variant="outline" onClick={refreshInsight} disabled={busy}>
                <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
              </Button>
            </div>
            <div className="mt-2 p-3 rounded-xl bg-muted text-sm whitespace-pre-wrap min-h-[64px]">
              {aiInsight || "(요약 리포트 없음)"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText /> Policy Editor (ops-policy.yaml)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={policy} onChange={(e) => setPolicy(e.target.value)} className="font-mono text-xs md:text-sm h-72" spellCheck={false} />
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={savePolicy} disabled={busy}>
              <Save className="w-4 h-4 mr-2" /> Save Policy
            </Button>
            {policySavedAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> 저장됨: {fmtTime(policySavedAt)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity /> Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">표시 개수</span>
            <Input
              type="number"
              className="w-24"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 1))}
              min={1}
            />
            <Button variant="outline" size="sm" onClick={refreshAudit}>
              <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
            </Button>
          </div>
          <ul className="space-y-2 max-h-[360px] overflow-auto">
            {audit.length === 0 && <li className="text-sm text-muted-foreground">감사 로그가 비어 있습니다.</li>}
            {audit.map((log, idx) => (
              <li key={`${log.at}-${idx}`} className="p-3 rounded-xl border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.decision === "allowed" ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">allowed</Badge>
                    ) : log.decision === "denied" ? (
                      <Badge variant="destructive">denied</Badge>
                    ) : (
                      <Badge variant="secondary">{log.decision || "info"}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{fmtTime(log.at)}</span>
                  </div>
                  <span className="text-[11px] rounded-full px-2 py-0.5 bg-muted">{log.actor || "unknown"}</span>
                </div>
                <div className="mt-2 text-sm font-medium">{log.action || "(action 없음)"}</div>
                {log.reason && (
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" /> {log.reason}
                  </div>
                )}
                {log.runId && <div className="mt-1 text-xs text-muted-foreground">run: {log.runId}</div>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}

