import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TrendData = {
  date: string;
  errors: number;
  users: number;
  ops: number;
};

type InsightsResponse = {
  status: "OK" | "Warning" | "Critical";
  summary: string;
  trend: TrendData[];
};

const STATUS_LABEL: Record<InsightsResponse["status"], string> = {
  OK: "All systems operational",
  Warning: "Minor issues detected – keep monitoring",
  Critical: "Immediate attention required",
};

const STATUS_STYLE: Record<InsightsResponse["status"], string> = {
  OK: "bg-emerald-500 hover:bg-emerald-500 text-white",
  Warning: "bg-amber-500 hover:bg-amber-500 text-white",
  Critical: "bg-destructive text-destructive-foreground",
};

export default function InsightsDashboard(): JSX.Element {
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [summary, setSummary] = useState<string>("요약 데이터를 불러오는 중입니다...");
  const [status, setStatus] = useState<InsightsResponse["status"]>("OK");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [commandBusy, setCommandBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/weekly-insights");
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        const data: InsightsResponse = await res.json();
        setTrend(data.trend ?? []);
        setSummary(data.summary ?? "요약 데이터가 없습니다.");
        setStatus(data.status ?? "OK");
        setError(null);
      } catch (err: any) {
        setError(err?.message ?? "데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold"
      >
        📊 AI Insights Dashboard
      </motion.h1>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>데이터 불러오기 실패</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Badge className={STATUS_STYLE[status]}>{status}</Badge>
          <span className="text-sm text-muted-foreground">{STATUS_LABEL[status]}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Summary (AI Generated)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">요약을 불러오는 중입니다...</p>
          ) : (
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-gray-100">
              {summary}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Errors" dot={false} />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="Users" dot={false} />
              <Line type="monotone" dataKey="ops" stroke="#10b981" strokeWidth={2} name="DB Ops" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Separator />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>AI Command Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <code>/pause</code>, <code>/resume</code>, <code>/deploy</code>, <code>/diagnose</code> 등의 명령을 입력해
            자동화 상태를 제어할 수 있습니다.
          </p>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command (e.g. /pause, /deploy, /diagnose)"
              className="flex-1"
            />
            <Button
              disabled={commandBusy || !command.trim()}
              onClick={async () => {
                if (!command.trim()) return;
                try {
                  setCommandBusy(true);
                  setCommandResult(null);
                  const res = await fetch("/api/ai-command", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ command: command.trim() }),
                  });
                  const text = await res.text();
                  setCommandResult(text);
                } catch (err: any) {
                  setCommandResult(`❌ 실행 실패: ${err?.message ?? err}`);
                } finally {
                  setCommandBusy(false);
                }
              }}
            >
              {commandBusy ? "Running..." : "Execute"}
            </Button>
          </div>
          {commandResult && (
            <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{commandResult}</div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Generated by AI Governance Console · Updated via /api/weekly-insights
      </p>
    </div>
  );
}

