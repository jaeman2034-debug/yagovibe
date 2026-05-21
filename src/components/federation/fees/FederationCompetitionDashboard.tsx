import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFederationCompetition,
  subscribeCompetitionEntries,
  subscribeCompetitionFeePayments,
  subscribeFederationCompetitions,
  subscribeFederationTeams,
  updateFederationCompetition,
  upsertCompetitionEntry,
} from "@/services/federationOperatingService";
import type {
  CompetitionFeePayment,
  FederationOperatingCompetition,
  FederationOperatingCompetitionEntry,
  FederationOperatingCompetitionKind,
  FederationOperatingTeam,
} from "@/types/federationOperating";
import { calculateCompetitionEntryFees } from "@/types/federationOperating";
import { db } from "@/lib/firebase";
import CompetitionFeePaymentDialog from "./CompetitionFeePaymentDialog";
import { toast } from "sonner";

type Props = { federationSlug: string };

const STATUS_LABEL: Record<string, string> = {
  unpaid: "미납",
  partial: "부분",
  paid: "완납",
};

type FederationUiRole = "ADMIN" | "MANAGER" | "VIEWER";

function canEdit(role: FederationUiRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

function canDelete(role: FederationUiRole): boolean {
  return role === "ADMIN";
}

export default function FederationCompetitionDashboard({ federationSlug }: Props) {
  const currentYear = new Date().getFullYear();
  const [competitions, setCompetitions] = useState<FederationOperatingCompetition[]>([]);
  const [teams, setTeams] = useState<FederationOperatingTeam[]>([]);
  const [entries, setEntries] = useState<FederationOperatingCompetitionEntry[]>([]);
  const [feePayments, setFeePayments] = useState<CompetitionFeePayment[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<FederationOperatingCompetitionEntry | null>(null);

  const [compOpen, setCompOpen] = useState(false);
  const [newCompName, setNewCompName] = useState("");
  const [newCompYear, setNewCompYear] = useState(String(currentYear));
  const [newCompKind, setNewCompKind] = useState<FederationOperatingCompetitionKind>("regular");
  const [newCompBase, setNewCompBase] = useState("200000");
  const [newCompExtra, setNewCompExtra] = useState("100000");
  const [compBusy, setCompBusy] = useState(false);

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryTeamId, setEntryTeamId] = useState("");
  const [entryCountStr, setEntryCountStr] = useState("1");
  const [entryBusy, setEntryBusy] = useState(false);
  const [actionBusyByCompId, setActionBusyByCompId] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [uiRole, setUiRole] = useState<FederationUiRole>("VIEWER");

  useEffect(() => {
    return subscribeFederationCompetitions(
      federationSlug,
      (rows) => setCompetitions(rows),
      (e) => setLoadErr(e.message)
    );
  }, [federationSlug]);

  useEffect(() => {
    return subscribeFederationTeams(
      federationSlug,
      (t) => setTeams(t.filter((x) => x.isActive)),
      (e) => setLoadErr(e.message)
    );
  }, [federationSlug]);

  useEffect(() => {
    if (!selectedCompetitionId) {
      setEntries([]);
      return;
    }
    return subscribeCompetitionEntries(
      federationSlug,
      selectedCompetitionId,
      (rows) => setEntries(rows),
      (e) => setLoadErr(e.message)
    );
  }, [federationSlug, selectedCompetitionId]);

  useEffect(() => {
    if (!selectedEntryId) {
      setFeePayments([]);
      return;
    }
    return subscribeCompetitionFeePayments(
      federationSlug,
      selectedEntryId,
      (rows) => setFeePayments(rows),
      (e) => setLoadErr(e.message)
    );
  }, [federationSlug, selectedEntryId]);

  useEffect(() => {
    if (selectedCompetitionId) return;
    if (competitions.length === 0) return;
    setSelectedCompetitionId(competitions[0].id);
  }, [competitions, selectedCompetitionId]);

  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === selectedCompetitionId) ?? null,
    [competitions, selectedCompetitionId]
  );

  const summary = useMemo(() => {
    let sumTotal = 0;
    let sumPaid = 0;
    for (const e of entries) {
      sumTotal += e.totalFeeAmount;
      sumPaid += e.paidAmount;
    }
    const n = entries.length;
    return { n, sumTotal, sumPaid, balance: sumTotal - sumPaid };
  }, [entries]);

  const entryPreview = useMemo(() => {
    if (!selectedCompetition || !entryTeamId) return null;
    const ec = Math.max(1, parseInt(entryCountStr, 10) || 1);
    return calculateCompetitionEntryFees(ec, selectedCompetition.teamBaseFee, selectedCompetition.extraTeamFee);
  }, [selectedCompetition, entryTeamId, entryCountStr]);

  const refreshAfterPayment = useCallback(() => {}, []);

  const saveCompetition = async () => {
    const name = newCompName.trim();
    if (!name) {
      toast.error("대회명을 입력하세요.");
      return;
    }
    const year = parseInt(newCompYear, 10);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      toast.error("연도를 확인하세요.");
      return;
    }
    const base = Math.floor(Number(String(newCompBase).replace(/,/g, "")));
    const extra = Math.floor(Number(String(newCompExtra).replace(/,/g, "")));
    if (!Number.isFinite(base) || base < 0 || !Number.isFinite(extra) || extra < 0) {
      toast.error("참가비 단가를 확인하세요.");
      return;
    }
    setCompBusy(true);
    try {
      const id = await createFederationCompetition(federationSlug, {
        name,
        year,
        kind: newCompKind,
        teamBaseFee: base,
        extraTeamFee: extra,
        status: "open",
      });
      toast.success("대회를 등록했습니다.");
      setCompOpen(false);
      setNewCompName("");
      setSelectedCompetitionId(id);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setCompBusy(false);
    }
  };

  const saveEntry = async () => {
    if (!selectedCompetitionId) {
      toast.error("대회를 선택하세요.");
      return;
    }
    const team = teams.find((t) => t.id === entryTeamId);
    if (!team) {
      toast.error("팀을 선택하세요.");
      return;
    }
    const ec = Math.max(1, parseInt(entryCountStr, 10) || 1);
    setEntryBusy(true);
    try {
      await upsertCompetitionEntry(federationSlug, selectedCompetitionId, team, ec);
      toast.success("참가 등록을 반영했습니다.");
      setEntryOpen(false);
      setEntryTeamId("");
      setEntryCountStr("1");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setEntryBusy(false);
    }
  };

  const selectedEntry = selectedEntryId ? entries.find((e) => e.id === selectedEntryId) : null;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => competitions.some((c) => c.id === id)));
  }, [competitions]);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setUiRole("VIEWER");
      return;
    }
    const unsubUser = onSnapshot(doc(db, "users", uid), (snap) => {
      const role = String((snap.data() || {}).role || "").toUpperCase();
      if (role === "ADMIN") setUiRole("ADMIN");
    });
    const unsubFed = onSnapshot(doc(db, "federations", federationSlug), (snap) => {
      const data = (snap.data() || {}) as Record<string, any>;
      const roles = (data.roles || {}) as Record<string, unknown>;
      const admins = Array.isArray(roles.admins) ? (roles.admins as unknown[]) : [];
      const managers = Array.isArray(roles.managers) ? (roles.managers as unknown[]) : [];
      const editors = Array.isArray(roles.editors) ? (roles.editors as unknown[]) : [];
      const viewers = Array.isArray(roles.viewers) ? (roles.viewers as unknown[]) : [];
      if (admins.includes(uid)) setUiRole("ADMIN");
      else if (managers.includes(uid) || editors.includes(uid)) setUiRole("MANAGER");
      else if (viewers.includes(uid)) setUiRole("VIEWER");
      else setUiRole("VIEWER");
    });
    return () => {
      unsubUser();
      unsubFed();
    };
  }, [federationSlug]);

  const getCompetitionActions = useCallback((comp: FederationOperatingCompetition) => {
    if (comp.status === "planned") return ["시작", "상세"] as const;
    if (comp.status === "open") return ["종료", "상세"] as const;
    if (comp.status === "closed" || comp.status === "settled") return ["결과보기", "상세"] as const;
    return ["상세"] as const;
  }, []);

  const handleCompetitionAction = useCallback(
    async (comp: FederationOperatingCompetition, action: "시작" | "종료" | "결과보기" | "상세") => {
      if (action === "상세" || action === "결과보기") {
        setSelectedCompetitionId(comp.id);
        setSelectedEntryId(null);
        if (action === "결과보기") toast.success(`"${comp.name}" 결과 화면으로 이동했습니다.`);
        return;
      }
      if (!canEdit(uiRole)) {
        toast.error("권한이 없습니다. 관리자에게 문의하세요.");
        return;
      }
      const confirmText =
        action === "시작"
          ? `"${comp.name}" 대회를 시작(진행중) 상태로 변경할까요?`
          : `"${comp.name}" 대회를 종료 상태로 변경할까요?`;
      if (!window.confirm(confirmText)) return;
      setActionBusyByCompId((prev) => ({ ...prev, [comp.id]: true }));
      try {
        await updateFederationCompetition(federationSlug, comp.id, {
          status: action === "시작" ? "open" : "closed",
        });
        toast.success(action === "시작" ? "대회를 시작했습니다." : "대회를 종료했습니다.");
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "상태 변경 실패");
      } finally {
        setActionBusyByCompId((prev) => ({ ...prev, [comp.id]: false }));
      }
    },
    [federationSlug, uiRole]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(competitions.map((c) => c.id));
  }, [competitions]);

  const clearSelected = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleBatchAction = useCallback(
    async (action: "start" | "end" | "delete") => {
      if (selectedIds.length === 0) return;
      if (!canEdit(uiRole)) {
        toast.error("권한이 없습니다. 관리자에게 문의하세요.");
        return;
      }
      if (action === "delete") {
        if (!canDelete(uiRole)) {
          toast.error("삭제 권한이 없습니다. ADMIN만 가능합니다.");
          return;
        }
        toast.error("일괄 삭제는 데이터 정합성 검증 후 지원 예정입니다.");
        return;
      }
      const actionLabel = action === "start" ? "시작" : "종료";
      if (!window.confirm(`선택한 ${selectedIds.length}개 대회를 일괄 ${actionLabel} 처리할까요?`)) return;
      setBatchBusy(true);
      try {
        await Promise.all(
          selectedIds.map((id) =>
            updateFederationCompetition(federationSlug, id, {
              status: action === "start" ? "open" : "closed",
            })
          )
        );
        toast.success(`${selectedIds.length}개 대회를 일괄 ${actionLabel} 처리했습니다.`);
        setSelectedIds([]);
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "일괄 처리 실패");
      } finally {
        setBatchBusy(false);
      }
    },
    [federationSlug, selectedIds, uiRole]
  );

  return (
    <div className="space-y-6">
      {loadErr ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          데이터 구독 오류: {loadErr}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px]">
          <Label className="text-xs text-gray-600">대회</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedCompetitionId}
            onChange={(e) => {
              setSelectedCompetitionId(e.target.value);
              setSelectedEntryId(null);
            }}
          >
            {competitions.length === 0 ? <option value="">등록된 대회 없음</option> : null}
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.year}] {c.name} ({c.status})
              </option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={() => setCompOpen(true)}>
          대회 등록
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setEntryOpen(true)}
          disabled={!selectedCompetitionId || !canEdit(uiRole)}
          title={!canEdit(uiRole) ? "권한이 없습니다" : undefined}
        >
          팀 참가 등록
        </Button>
      </div>

      {selectedCompetition ? (
        <p className="text-xs text-gray-500">
          1팀 기본 {formatWon(selectedCompetition.teamBaseFee)} · 추가 팀당 {formatWon(selectedCompetition.extraTeamFee)}
        </p>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="참가 팀(엔트리)" value={String(summary.n)} />
        <SummaryCard label="참가비 청구 합계" value={formatWon(summary.sumTotal)} />
        <SummaryCard label="수납 누적" value={formatWon(summary.sumPaid)} />
        <SummaryCard label="잔액(미수)" value={formatWon(Math.max(0, summary.balance))} />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-700">대회 빠른 액션</p>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-gray-500">{selectedIds.length}개 선택됨</span>
            <Button type="button" size="sm" variant="outline" onClick={selectAll}>
              전체 선택
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearSelected}>
              선택 해제
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.length === 0 || batchBusy || !canEdit(uiRole)}
              title={!canEdit(uiRole) ? "권한이 없습니다" : undefined}
              onClick={() => void handleBatchAction("start")}
            >
              {batchBusy ? "처리중..." : "일괄 시작"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selectedIds.length === 0 || batchBusy || !canEdit(uiRole)}
              title={!canEdit(uiRole) ? "권한이 없습니다" : undefined}
              onClick={() => void handleBatchAction("end")}
            >
              일괄 종료
            </Button>
          </div>
        </div>
        {competitions.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 대회가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {competitions.map((comp) => {
              const selected = selectedCompetitionId === comp.id;
              const actions = getCompetitionActions(comp);
              const busy = !!actionBusyByCompId[comp.id];
              const checked = selectedIds.includes(comp.id);
              return (
                <div
                  key={comp.id}
                  className={`rounded-lg border p-3 bg-white ${
                    checked ? "border-blue-400 bg-blue-50/40" : selected ? "border-primary-300 ring-1 ring-primary-200" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(comp.id)}
                        className="h-4 w-4 mt-0.5"
                        aria-label={`${comp.name} 선택`}
                      />
                      <div>
                      <p className="text-sm font-semibold text-gray-900">{comp.name}</p>
                      <p className="text-[11px] text-gray-500">
                        [{comp.year}] {comp.kind} · 상태 {comp.status}
                      </p>
                      </div>
                    </div>
                    {selected ? (
                      <span className="text-[10px] rounded px-1.5 py-0.5 bg-primary-50 text-primary-700">선택됨</span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {actions.map((action) => (
                      <Button
                        key={action}
                        type="button"
                        variant={action === "상세" ? "outline" : "default"}
                        className="h-11 text-sm"
                        disabled={busy || ((action === "시작" || action === "종료") && !canEdit(uiRole))}
                        title={
                          (action === "시작" || action === "종료") && !canEdit(uiRole) ? "권한이 없습니다" : undefined
                        }
                        onClick={() => void handleCompetitionAction(comp, action)}
                      >
                        {busy && (action === "시작" || action === "종료") ? "처리중..." : action}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedIds.length > 0 ? (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl space-y-2">
            <p className="text-xs text-gray-600">{selectedIds.length}개 선택됨</p>
            <div className="grid grid-cols-4 gap-2">
              <Button type="button" variant="outline" className="h-11 text-xs" onClick={selectAll}>
                전체
              </Button>
              <Button type="button" variant="outline" className="h-11 text-xs" onClick={clearSelected}>
                해제
              </Button>
              <Button
                type="button"
                className="h-11 text-xs"
                disabled={batchBusy || !canEdit(uiRole)}
                title={!canEdit(uiRole) ? "권한이 없습니다" : undefined}
                onClick={() => void handleBatchAction("start")}
              >
                {batchBusy ? "처리중" : "시작"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 text-xs"
                disabled={batchBusy || !canEdit(uiRole)}
                title={!canEdit(uiRole) ? "권한이 없습니다" : undefined}
                onClick={() => void handleBatchAction("end")}
              >
                종료
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-600">
            <tr>
              <th className="px-3 py-2">팀</th>
              <th className="px-3 py-2 text-right">참가 단위</th>
              <th className="px-3 py-2 text-right">청구</th>
              <th className="px-3 py-2 text-right">납부</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  참가 등록된 팀이 없습니다.
                </td>
              </tr>
            ) : (
              entries.map((e) => {
                const sel = selectedEntryId === e.id;
                return (
                  <tr
                    key={e.id}
                    className={`cursor-pointer hover:bg-gray-50/80 ${sel ? "bg-primary-50/50" : ""}`}
                    onClick={() => setSelectedEntryId(sel ? null : e.id)}
                  >
                    <td className="px-3 py-2 font-medium text-gray-900">{e.teamName || e.teamId}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.entryCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatWon(e.totalFeeAmount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatWon(e.paidAmount)}</td>
                    <td className="px-3 py-2">{STATUS_LABEL[e.status] ?? e.status}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canEdit(uiRole)}
                        title={!canEdit(uiRole) ? "권한이 없습니다" : undefined}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setPayTarget(e);
                        }}
                      >
                        납부 입력
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedEntry && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            참가비 납부 내역 — {selectedEntry.teamName || selectedEntry.teamId}
          </h4>
          {feePayments.length === 0 ? (
            <p className="text-sm text-gray-500">납부 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {feePayments.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-2">
                  <span className="text-gray-700">{p.paidAt?.slice(0, 10) ?? "—"}</span>
                  <span className="font-medium tabular-nums">{formatWon(p.amount)}</span>
                  <span className="text-gray-500">{p.method ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {payTarget && selectedCompetition ? (
        <CompetitionFeePaymentDialog
          open={!!payTarget}
          onClose={() => setPayTarget(null)}
          federationSlug={federationSlug}
          entryId={payTarget.id}
          competitionId={payTarget.competitionId}
          teamId={payTarget.teamId}
          teamName={payTarget.teamName || payTarget.teamId}
          competitionName={selectedCompetition.name}
          totalFeeAmount={payTarget.totalFeeAmount}
          paidAmount={payTarget.paidAmount}
          onRecorded={refreshAfterPayment}
        />
      ) : null}

      {compOpen ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="닫기"
            onClick={() => setCompOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-3">대회 등록</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">대회명</Label>
                <Input className="mt-1" value={newCompName} onChange={(e) => setNewCompName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">연도</Label>
                <Input className="mt-1" type="number" value={newCompYear} onChange={(e) => setNewCompYear(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">종류</Label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm"
                  value={newCompKind}
                  onChange={(e) => setNewCompKind(e.target.value as FederationOperatingCompetitionKind)}
                >
                  <option value="regular">일반</option>
                  <option value="league">리그</option>
                  <option value="friendly">친선</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">1팀 기본 참가비 (원)</Label>
                <Input className="mt-1" value={newCompBase} onChange={(e) => setNewCompBase(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">추가 팀(단위)당 참가비 (원)</Label>
                <Input className="mt-1" value={newCompExtra} onChange={(e) => setNewCompExtra(e.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCompOpen(false)} disabled={compBusy}>
                취소
              </Button>
              <Button
                type="button"
                onClick={() => void saveCompetition()}
                disabled={compBusy || !canEdit(uiRole)}
                title={!canEdit(uiRole) ? "권한이 없습니다" : undefined}
              >
                {compBusy ? "저장 중…" : "저장"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {entryOpen ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="닫기"
            onClick={() => setEntryOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">팀 참가 등록</h3>
            {!selectedCompetitionId ? (
              <p className="text-sm text-amber-700">먼저 대회를 선택하거나 등록하세요.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">팀</Label>
                  <select
                    className="mt-1 w-full h-10 rounded-md border border-input px-3 text-sm"
                    value={entryTeamId}
                    onChange={(e) => setEntryTeamId(e.target.value)}
                  >
                    <option value="">선택</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">참가 단위 수 (≥1)</Label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    value={entryCountStr}
                    onChange={(e) => setEntryCountStr(e.target.value)}
                  />
                </div>
                {entryPreview ? (
                  <p className="text-sm text-gray-600 rounded border border-gray-100 bg-gray-50 px-2 py-2">
                    예상 청구: 기본 {formatWon(entryPreview.baseFeeAmount)} + 추가{" "}
                    {formatWon(entryPreview.extraFeeAmount)} ={" "}
                    <span className="font-semibold">{formatWon(entryPreview.totalFeeAmount)}</span>
                  </p>
                ) : null}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEntryOpen(false)} disabled={entryBusy}>
                취소
              </Button>
              <Button
                type="button"
                onClick={() => void saveEntry()}
                disabled={entryBusy || !selectedCompetitionId || !canEdit(uiRole)}
                title={!canEdit(uiRole) ? "권한이 없습니다" : undefined}
              >
                {entryBusy ? "저장 중…" : "등록"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="md:hidden h-28" />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function formatWon(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.max(0, Math.floor(n))) + "원";
}
