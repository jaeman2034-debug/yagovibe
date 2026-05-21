import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFederationTeam,
  createYearlyFeeAccounts,
  subscribeFederationTeams,
  subscribeTeamFeeAccounts,
  subscribeTeamFeePayments,
} from "@/services/federationOperatingService";
import type { FederationOperatingTeam, TeamFeeAccount, TeamFeePayment } from "@/types/federationOperating";
import FederationTeamFeeTable, { type TeamFeeRow } from "./FederationTeamFeeTable";
import TeamFeePaymentDialog from "./TeamFeePaymentDialog";
import { toast } from "sonner";

type Props = {
  federationSlug: string;
};

export default function FederationTeamFeeDashboard({ federationSlug }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [teams, setTeams] = useState<FederationOperatingTeam[]>([]);
  const [accounts, setAccounts] = useState<TeamFeeAccount[]>([]);
  const [payments, setPayments] = useState<TeamFeePayment[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [payTeam, setPayTeam] = useState<FederationOperatingTeam | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState<FederationOperatingTeam["ageGroup"]>("40");
  const [newFee, setNewFee] = useState("2500000");
  const [addBusy, setAddBusy] = useState(false);

  useEffect(() => {
    const u1 = subscribeFederationTeams(
      federationSlug,
      (t) => setTeams(t),
      (e) => setLoadErr(e.message)
    );
    return () => u1();
  }, [federationSlug]);

  useEffect(() => {
    const u2 = subscribeTeamFeeAccounts(
      federationSlug,
      year,
      (a) => setAccounts(a),
      (e) => setLoadErr(e.message)
    );
    return () => u2();
  }, [federationSlug, year]);

  useEffect(() => {
    if (!selectedTeamId) {
      setPayments([]);
      return;
    }
    const u3 = subscribeTeamFeePayments(
      federationSlug,
      selectedTeamId,
      year,
      (p) => setPayments(p),
      (e) => setLoadErr(e.message)
    );
    return () => u3();
  }, [federationSlug, selectedTeamId, year]);

  const accountByTeamId = useMemo(() => {
    const m = new Map<string, TeamFeeAccount>();
    for (const a of accounts) {
      m.set(a.teamId, a);
    }
    return m;
  }, [accounts]);

  const rows: TeamFeeRow[] = useMemo(() => {
    return teams.map((team) => ({
      team,
      account: accountByTeamId.get(team.id) ?? null,
    }));
  }, [teams, accountByTeamId]);

  const summary = useMemo(() => {
    const activeTeams = teams.filter((t) => t.isActive);
    const n = activeTeams.length;
    let paidC = 0;
    let partialC = 0;
    let unpaidC = 0;
    let noAcc = 0;
    let sumPaid = 0;
    let sumBilled = 0;
    for (const t of activeTeams) {
      const acc = accountByTeamId.get(t.id);
      if (!acc) {
        noAcc++;
        continue;
      }
      sumPaid += acc.paidAmount;
      sumBilled += acc.billedAmount;
      if (acc.status === "paid") paidC++;
      else if (acc.status === "partial") partialC++;
      else unpaidC++;
    }
    const rate = sumBilled > 0 ? Math.round((sumPaid / sumBilled) * 1000) / 10 : 0;
    return { n, paidC, partialC, unpaidC, noAcc, sumPaid, sumBilled, rate };
  }, [teams, accountByTeamId]);

  const refreshAfterPayment = useCallback(() => {
    /* onSnapshot 이 갱신 */
  }, []);

  const runBulkAccounts = async () => {
    setBulkBusy(true);
    try {
      const { created, skipped } = await createYearlyFeeAccounts(federationSlug, year);
      toast.success(`회비 계정: 신규 ${created}건, 이미 있음 ${skipped}건`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "일괄 생성에 실패했습니다.");
    } finally {
      setBulkBusy(false);
    }
  };

  const addTeam = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("팀명을 입력하세요.");
      return;
    }
    const fee = Math.floor(Number(String(newFee).replace(/,/g, "")));
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("연회비 금액을 확인하세요.");
      return;
    }
    setAddBusy(true);
    try {
      await createFederationTeam(federationSlug, {
        name,
        ageGroup: newAge,
        annualFeeAmount: fee,
      });
      toast.success("팀을 추가했습니다.");
      setAddOpen(false);
      setNewName("");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "팀 추가 실패");
    } finally {
      setAddBusy(false);
    }
  };

  const selectedTeam = selectedTeamId ? teams.find((t) => t.id === selectedTeamId) : null;

  return (
    <div className="space-y-6">
      {loadErr ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          데이터 구독 오류: {loadErr} (협회 매니저 권한·Rules를 확인하세요.)
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs text-gray-600">연도</Label>
          <Input
            className="mt-1 w-28"
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || currentYear)}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void runBulkAccounts()} disabled={bulkBusy}>
          {bulkBusy ? "처리 중…" : `${year}년 회비 계정 일괄 생성`}
        </Button>
        <Button type="button" onClick={() => setAddOpen(true)}>
          팀 추가
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="활성 팀" value={String(summary.n)} />
        <SummaryCard label="완납" value={String(summary.paidC)} />
        <SummaryCard label="부분 납부" value={String(summary.partialC)} />
        <SummaryCard label="미납" value={String(summary.unpaidC)} />
        <SummaryCard label="계정 없음" value={String(summary.noAcc)} sub="일괄 생성 필요" />
        <SummaryCard
          label="올해 수납률"
          value={`${summary.rate}%`}
          sub={
            summary.sumBilled > 0
              ? `${formatWon(summary.sumPaid)} / ${formatWon(summary.sumBilled)}`
              : "청구 합계 없음"
          }
        />
      </div>

      <FederationTeamFeeTable
        rows={rows}
        selectedTeamId={selectedTeamId}
        onSelectTeam={setSelectedTeamId}
        onPay={(t) => setPayTeam(t)}
        loading={false}
      />

      {selectedTeam && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            납부 내역 — {selectedTeam.name} ({year}년)
          </h4>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">납부 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-2">
                  <span className="text-gray-700">{p.paidAt?.slice(0, 10) ?? "—"}</span>
                  <span className="font-medium tabular-nums">{formatWon(p.amount)}</span>
                  <span className="text-gray-500">{p.method ?? "—"}</span>
                  {p.installmentNo != null ? (
                    <span className="text-xs text-gray-400">{p.installmentNo}회차</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {payTeam ? (
        <TeamFeePaymentDialog
          open={!!payTeam}
          onClose={() => setPayTeam(null)}
          federationSlug={federationSlug}
          teamId={payTeam.id}
          teamName={payTeam.name}
          year={year}
          onRecorded={refreshAfterPayment}
        />
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="닫기"
            onClick={() => setAddOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">팀 추가</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">팀명</Label>
                <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">연령대</Label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value as FederationOperatingTeam["ageGroup"])}
                >
                  <option value="20_30">20·30대</option>
                  <option value="40">40대</option>
                  <option value="50">50대</option>
                  <option value="60">60대+</option>
                  <option value="other">기타</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">연회비 (원)</Label>
                <Input className="mt-1" value={newFee} onChange={(e) => setNewFee(e.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addBusy}>
                취소
              </Button>
              <Button type="button" onClick={() => void addTeam()} disabled={addBusy}>
                {addBusy ? "저장 중…" : "저장"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900 mt-0.5">{value}</p>
      {sub ? <p className="text-[11px] text-gray-400 mt-1 leading-snug">{sub}</p> : null}
    </div>
  );
}

function formatWon(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.max(0, Math.floor(n))) + "원";
}
