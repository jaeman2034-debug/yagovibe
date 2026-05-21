/**
 * 팀 멤버 탭 — teams/{teamId}/members 실시간 + users 프로필 이름
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  type QuerySnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { CLOUD_CALLABLE_REPAIR } from "@/config/cloudCallableNames";
import { callableErrorMessage } from "@/lib/errors/callableErrorMessage";
import { db, functions } from "@/lib/firebase";
import { Crown, Loader2, MoreHorizontal, RefreshCw, User, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  deleteTeamMember,
  updateTeamMemberProfile,
  type UpdateTeamMemberProfileInput,
} from "@/services/teamMemberService";
import { formatPhoneDigitsForDisplay } from "@/utils/phone";
import { transferCaptain } from "@/lib/team/transferCaptain";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FALLBACK_MEMBER_DISPLAY_NAME,
  pickDisplayNameFromRecord,
} from "@/lib/team/memberDisplayName";
import { isCorruptedMemberDisplayName } from "@/lib/team/corruptedMemberName";

const errorMessageOf = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
};

const normalizeUniformSize = (value?: string): string => {
  const v = String(value || "").trim().toUpperCase();
  return ["S", "M", "L", "XL", "2XL", "XXL"].includes(v)
    ? v === "XXL"
      ? "2XL"
      : v
    : "";
};

const normalizePosition = (value?: string): string => {
  const v = String(value || "").trim().toUpperCase();
  return ["GK", "DF", "MF", "FW"].includes(v) ? v : "";
};

/** 표시 이름 가나다순 (동명이인·문서 ID로 안정 정렬) */
function compareMemberDisplayNameKo(a: Row, b: Row): number {
  const byName = a.displayName.localeCompare(b.displayName, "ko", { sensitivity: "base" });
  if (byName !== 0) return byName;
  return a.memberDocId.localeCompare(b.memberDocId);
}

/** members 문서에 number·문자열로 섞여 있을 수 있음 */
function readJerseyFromMember(m: Record<string, unknown>): number | undefined {
  const j = m.jerseyNumber;
  if (typeof j === "number" && Number.isFinite(j)) {
    const v = Math.trunc(j);
    if (v > 0 && v <= 999) return v;
  }
  if (typeof j === "string" && j.trim()) {
    const n = parseInt(j.trim(), 10);
    if (Number.isFinite(n) && n > 0 && n <= 999) return n;
  }
  return undefined;
}

type Row = {
  /** members 문서 ID (초대 선등록 시 Auth uid와 다를 수 있음) */
  memberDocId: string;
  /** users/{id} 조회용 — invited·무userId 멤버는 null */
  profileUid: string | null;
  displayName: string;
  role?: string;
  memberStatus?: string;
  phone?: string;
  jerseyNumber?: number;
  birthYear?: number;
  uniformSize?: string;
  position?: string;
  roleDetail?: string;
  note?: string;
  duesType?: "monthly" | "yearly" | "exempt" | "discount";
  discountAmount?: number;
  discountLabel?: string;
  authUserId?: string | null;
};

type TeamMembersPanelProps = {
  teamId: string;
  /** 팀장이면 SoT 불일치 시 1회 서버 복구 Callable 시도 */
  isOwner?: boolean;
  /** teams 문서의 비정규화 memberCount (스냅샷 실제 문서 수보다 클 때 복구 힌트) */
  teamDocMemberCount?: number | null;
  /** TeamHome 등에서 구독 중인 members 컬렉션 문서 수 */
  liveMembersDocCount?: number;
  ageFilter?: string;
  positionFilter?: string;
};

export function TeamMembersPanel({
  teamId,
  isOwner,
  teamDocMemberCount,
  liveMembersDocCount,
  ageFilter = "전체",
  positionFilter = "전체",
}: TeamMembersPanelProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionTarget, setActionTarget] = useState<Row | null>(null);
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editJerseyNumber, setEditJerseyNumber] = useState("");
  const [editBirthYear, setEditBirthYear] = useState("");
  const [editUniformSize, setEditUniformSize] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editRoleDetail, setEditRoleDetail] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDuesType, setEditDuesType] = useState<"monthly" | "yearly" | "exempt" | "discount">("monthly");
  const [editDiscountAmount, setEditDiscountAmount] = useState("");
  const [editDiscountLabel, setEditDiscountLabel] = useState("");
  const repairAttempted = useRef(false);
  const [corruptBulkOpen, setCorruptBulkOpen] = useState(false);
  const [corruptBulkBusy, setCorruptBulkBusy] = useState(false);

  const repairFnName = useMemo(
    () =>
      import.meta.env.VITE_REPAIR_TEAM_MEMBERS_CALLABLE_ID ??
      CLOUD_CALLABLE_REPAIR.repairTeamMembersSoTFromIndex,
    []
  );

  const callRepairSoT = useCallback(async () => {
    const fn = httpsCallable(functions, repairFnName);
    const res = await fn({ teamId });
    return res.data as {
      ok?: boolean;
      repaired?: number;
      skipped?: number;
      memberCount?: number;
    };
  }, [teamId, repairFnName]);

  useEffect(() => {
    repairAttempted.current = false;
  }, [teamId]);

  /** teams.memberCount만 실제와 맞춰져 있어도, 목록 행 수(rows)와 불일치하면 복구 시도 */
  useEffect(() => {
    if (!teamId || !isOwner || loading || repairAttempted.current) return;

    const mismatchVsLiveSnap =
      typeof teamDocMemberCount === "number" &&
      typeof liveMembersDocCount === "number" &&
      teamDocMemberCount !== liveMembersDocCount;
    const teamCountAboveRenderedRows =
      typeof teamDocMemberCount === "number" && teamDocMemberCount > rows.length;

    if (!mismatchVsLiveSnap && !teamCountAboveRenderedRows) return;

    repairAttempted.current = true;
    void (async () => {
      try {
        await callRepairSoT();
      } catch (e) {
        console.warn("[TeamMembersPanel] SoT 자동 복구 실패(무시):", e);
      }
    })();
  }, [
    teamId,
    isOwner,
    loading,
    teamDocMemberCount,
    liveMembersDocCount,
    rows.length,
    callRepairSoT,
  ]);

  const handleManualSync = useCallback(async () => {
    if (!teamId || !isOwner || syncing) return;
    setSyncing(true);
    try {
      const data = await callRepairSoT();
      const r = data.repaired ?? 0;
      const n = data.memberCount;
      toast.success(
        typeof n === "number"
          ? `멤버 동기화 완료 · 복구 ${r}건 · 현재 ${n}명`
          : `멤버 동기화 완료 · 복구 ${r}건`
      );
    } catch (e: unknown) {
      const base = callableErrorMessage(e);
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code ?? "")
          : "";
      const hint =
        code === "functions/internal"
          ? " (기본 functions 배포·프로젝트 ID·함수명 repairTeamMembersSoTFromIndex·Cloud Logging 확인)"
          : "";
      toast.error(`동기화 실패: ${base}${hint}`);
    } finally {
      setSyncing(false);
    }
  }, [teamId, isOwner, syncing, callRepairSoT]);

  useEffect(() => {
    if (!teamId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let cancelled = false;
    const col = collection(db, "teams", teamId, "members");

    const roleByDocIdFromSnap = (snap: QuerySnapshot) => {
      const roleByDocId = new Map<string, string>();
      snap.docs.forEach((d) => {
        const r = (d.data() as { role?: string })?.role;
        if (r) roleByDocId.set(d.id, r);
      });
      return roleByDocId;
    };

    const rowsFromMemberDocsOnly = (snap: QuerySnapshot): Row[] => {
      const roleByDocId = roleByDocIdFromSnap(snap);
      const activeDocs = snap.docs.filter((memberDoc) => {
        const del = (memberDoc.data() as { isDeleted?: boolean })?.isDeleted;
        return del !== true;
      });
      return activeDocs.map((memberDoc) => {
        const memberDocId = memberDoc.id;
        const m = (memberDoc.data() ?? {}) as Record<string, unknown>;
        const userIdField =
          typeof m.userId === "string" && m.userId.trim() ? String(m.userId).trim() : "";
        const profileUid = userIdField || null;
        const fromMember = pickDisplayNameFromRecord(m);
        const displayName = fromMember || FALLBACK_MEMBER_DISPLAY_NAME;
        const memberStatus =
          typeof m.status === "string" ? String(m.status).toLowerCase() : "active";
        const phone = typeof m.phone === "string" ? m.phone : undefined;
        const jerseyNumber = readJerseyFromMember(m);
        const birthYear = typeof m.birthYear === "number" ? m.birthYear : undefined;
        const uniformSizeNorm = typeof m.uniformSize === "string" ? normalizeUniformSize(m.uniformSize) : "";
        const positionNorm = typeof m.position === "string" ? normalizePosition(m.position) : "";
        const roleDetail = typeof m.roleDetail === "string" ? m.roleDetail : undefined;
        const note = typeof m.note === "string" ? m.note : undefined;
        const rawDuesType = typeof m.duesType === "string" ? m.duesType.toLowerCase() : "";
        const duesType: "monthly" | "yearly" | "exempt" | "discount" =
          rawDuesType === "yearly" || rawDuesType === "annual"
            ? "yearly"
            : rawDuesType === "exempt"
              ? "exempt"
              : rawDuesType === "discount"
                ? "discount"
                : "monthly";
        const discountAmount =
          typeof m.discountAmount === "number" && Number.isFinite(m.discountAmount)
            ? Math.max(0, Math.floor(m.discountAmount))
            : undefined;
        const discountLabel =
          typeof m.discountLabel === "string" && m.discountLabel.trim() ? m.discountLabel.trim() : undefined;
        const authUserId =
          typeof m.userId === "string" && m.userId.trim() ? String(m.userId).trim() : null;
        return {
          memberDocId,
          profileUid,
          displayName,
          role: roleByDocId.get(memberDocId),
          memberStatus,
          phone,
          jerseyNumber,
          birthYear,
          uniformSize: uniformSizeNorm || undefined,
          position: positionNorm || undefined,
          roleDetail,
          note,
          duesType,
          discountAmount,
          discountLabel,
          authUserId,
        };
      });
    };

    const enrichRowsFromUsers = async (snap: QuerySnapshot): Promise<Row[]> => {
      const roleByDocId = roleByDocIdFromSnap(snap);
      const activeDocs = snap.docs.filter((memberDoc) => {
        const del = (memberDoc.data() as { isDeleted?: boolean })?.isDeleted;
        return del !== true;
      });
      return Promise.all(
        activeDocs.map(async (memberDoc) => {
          const memberDocId = memberDoc.id;
          try {
            const mRaw = memberDoc.data() ?? {};
            const m = mRaw as Record<string, unknown>;
            const fromMember = pickDisplayNameFromRecord(m);
            const userIdField =
              typeof m.userId === "string" && m.userId.trim() ? String(m.userId).trim() : "";
            const profileUid = userIdField || null;
            const memberStatus =
              typeof m.status === "string" ? String(m.status).toLowerCase() : "active";
            const phone = typeof m.phone === "string" ? m.phone : undefined;
            const jerseyNumber = readJerseyFromMember(m);
            const birthYear = typeof m.birthYear === "number" ? m.birthYear : undefined;
            const uniformSizeNorm = typeof m.uniformSize === "string" ? normalizeUniformSize(m.uniformSize) : "";
            const positionNorm = typeof m.position === "string" ? normalizePosition(m.position) : "";
            const roleDetail = typeof m.roleDetail === "string" ? m.roleDetail : undefined;
            const note = typeof m.note === "string" ? m.note : undefined;
            const rawDuesType = typeof m.duesType === "string" ? m.duesType.toLowerCase() : "";
            const duesType: "monthly" | "yearly" | "exempt" | "discount" =
              rawDuesType === "yearly" || rawDuesType === "annual"
                ? "yearly"
                : rawDuesType === "exempt"
                  ? "exempt"
                  : rawDuesType === "discount"
                    ? "discount"
                    : "monthly";
            const discountAmount =
              typeof m.discountAmount === "number" && Number.isFinite(m.discountAmount)
                ? Math.max(0, Math.floor(m.discountAmount))
                : undefined;
            const discountLabel =
              typeof m.discountLabel === "string" && m.discountLabel.trim() ? m.discountLabel.trim() : undefined;
            const authUserId =
              typeof m.userId === "string" && m.userId.trim() ? String(m.userId).trim() : null;

            let displayName = fromMember;
            if (profileUid) {
              const uSnap = await getDoc(doc(db, "users", profileUid));
              if (uSnap.exists()) {
                const fromUser = pickDisplayNameFromRecord(uSnap.data() as Record<string, unknown>);
                displayName = fromMember || fromUser;
              }
            }
            if (!displayName) {
              displayName = FALLBACK_MEMBER_DISPLAY_NAME;
            }
            return {
              memberDocId,
              profileUid,
              displayName,
              role: roleByDocId.get(memberDocId),
              memberStatus,
              phone,
              jerseyNumber,
              birthYear,
              uniformSize: uniformSizeNorm || undefined,
              position: positionNorm || undefined,
              roleDetail,
              note,
              duesType,
              discountAmount,
              discountLabel,
              authUserId,
            } satisfies Row;
          } catch {
            return {
              memberDocId,
              profileUid: null,
              displayName: FALLBACK_MEMBER_DISPLAY_NAME,
              role: roleByDocId.get(memberDocId),
              memberStatus: "active",
            };
          }
        })
      );
    };

    const unsub = onSnapshot(
      col,
      (snap) => {
        if (cancelled) return;
        setRows(rowsFromMemberDocsOnly(snap));
        setLoading(false);

        void (async () => {
          try {
            const resolved = await enrichRowsFromUsers(snap);
            if (cancelled) return;
            setRows(resolved);
          } catch (e) {
            console.warn("[TeamMembersPanel] 프로필 보강 실패(멤버 문서만 표시):", e);
          }
        })();
      },
      (err) => {
        console.error("[TeamMembersPanel] members snapshot error:", err);
        if (cancelled) return;
        setRows([]);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex min-h-[12rem] w-full items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        {isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
            <p className="text-xs text-amber-900">
              팀 문서 인원과 실제 멤버가 어긋날 수 있어요. <strong>team_members</strong> 기준으로 SoT(
              <code className="rounded bg-white/80 px-1">teams/…/members</code>)를 맞춥니다.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-300 bg-white"
              disabled={syncing}
              onClick={() => void handleManualSync()}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1.5">멤버 동기화</span>
            </Button>
          </div>
        )}
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          등록된 멤버가 없습니다.
        </p>
      </div>
    );
  }

  const roleWeight = (role?: string): number => {
    const r = String(role || "").toLowerCase();
    if (r === "owner" || r === "admin") return 0;
    return 1;
  };
  const sortedRows = [...rows].sort((a, b) => roleWeight(a.role) - roleWeight(b.role));
  const captain = sortedRows.find((m) => roleWeight(m.role) === 0) || null;
  const regularMembers = sortedRows.filter((m) => m !== captain).sort(compareMemberDisplayNameKo);
  /** PDF를 CSV로 잘못 넣은 등으로 깨진 표시명 — 계정 미연결·운영자 행 제외 후 일괄 제거 대상 */
  const corruptGarbageMembers = rows.filter((r) => {
    if (r.authUserId || r.profileUid) return false;
    const rl = String(r.role || "").toLowerCase();
    if (rl === "owner" || rl === "admin") return false;
    if (captain && r.memberDocId === captain.memberDocId) return false;
    return isCorruptedMemberDisplayName(r.displayName);
  });
  const thisYear = new Date().getFullYear();
  const ageDecadeMatches = (birthYear?: number): boolean => {
    if (ageFilter === "전체") return true;
    if (!birthYear) return false;
    const age = thisYear - birthYear + 1;
    const decade = `${Math.floor(age / 10) * 10}대`;
    return decade === ageFilter;
  };
  const positionMatches = (position?: string): boolean => {
    if (positionFilter === "전체") return true;
    return String(position || "").toUpperCase() === positionFilter;
  };
  const visibleMembers = regularMembers.filter(
    (m) => ageDecadeMatches(m.birthYear) && positionMatches(m.position)
  );

  const handleDelegateCaptain = async (m: Row) => {
    if (!isOwner) return;
    if (!m.memberDocId || m.memberStatus === "invited") {
      toast.error("가입 완료된 멤버에게만 위임할 수 있습니다.");
      return;
    }
    const ok = window.confirm(`${m.displayName}님에게 팀장 권한을 위임할까요?`);
    if (!ok) return;
    try {
      await transferCaptain(teamId, m.memberDocId);
      setActionTarget(null);
      toast.success("팀장 위임을 완료했습니다.");
    } catch (error: unknown) {
      toast.error(errorMessageOf(error, "팀장 위임에 실패했습니다."));
    }
  };

  const handleBulkRemoveCorrupt = async () => {
    if (!isOwner || !teamId || corruptGarbageMembers.length === 0) return;
    setCorruptBulkBusy(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const m of corruptGarbageMembers) {
        try {
          await deleteTeamMember(teamId, m.memberDocId);
          ok += 1;
        } catch (e) {
          console.warn("[TeamMembersPanel] bulk remove corrupt member", m.memberDocId, e);
          fail += 1;
        }
      }
      setCorruptBulkOpen(false);
      if (fail === 0) {
        toast.success(`오류로 보이는 멤버 ${ok}명을 팀에서 제거했습니다.`);
      } else {
        toast.warning(`제거 ${ok}명 / 실패 ${fail}건. 네트워크·권한을 확인해 주세요.`);
      }
    } finally {
      setCorruptBulkBusy(false);
    }
  };

  const handleRemoveMember = async (m: Row) => {
    if (!isOwner) return;
    const ok = window.confirm(`${m.displayName}님을 팀에서 제외할까요?`);
    if (!ok) return;
    try {
      await deleteTeamMember(teamId, m.memberDocId);
      setActionTarget(null);
      toast.success("멤버를 제외했습니다.");
    } catch (error: unknown) {
      toast.error(errorMessageOf(error, "멤버 제외에 실패했습니다."));
    }
  };

  const openEditModal = (m: Row) => {
    setActionTarget(null);
    setEditTarget(m);
    setEditPhone(m.phone || "");
    setEditJerseyNumber(m.jerseyNumber != null ? String(m.jerseyNumber) : "");
    setEditBirthYear(m.birthYear != null ? String(m.birthYear) : "");
    setEditUniformSize(normalizeUniformSize(m.uniformSize));
    setEditPosition(normalizePosition(m.position));
    setEditRoleDetail(m.roleDetail || "");
    setEditNote(m.note || "");
    setEditDuesType(m.duesType || "monthly");
    setEditDiscountAmount(m.discountAmount != null ? String(m.discountAmount) : "");
    setEditDiscountLabel(m.discountLabel || "");
  };

  const submitEdit = async () => {
    if (!editTarget || savingEdit) return;
    const discountAmountParsed =
      editDuesType === "discount"
        ? Math.floor(Number(editDiscountAmount.replace(/[^\d]/g, "") || "0"))
        : null;
    if (editDuesType === "discount" && (!Number.isFinite(discountAmountParsed) || discountAmountParsed <= 0)) {
      toast.error("준회원은 할인 금액을 입력해야 합니다.");
      return;
    }
    const feeType =
      editDuesType === "yearly"
        ? "ANNUAL"
        : editDuesType === "exempt"
          ? "FREE"
          : editDuesType === "discount"
            ? "DISCOUNT"
            : "MONTHLY";
    const payload: UpdateTeamMemberProfileInput = {
      teamId,
      memberId: editTarget.memberDocId,
      jerseyNumber: editJerseyNumber.trim() ? Number(editJerseyNumber) : null,
      birthYear: editBirthYear.trim() ? Number(editBirthYear) : null,
      uniformSize: normalizeUniformSize(editUniformSize) || null,
      position: normalizePosition(editPosition) || null,
      roleDetail: editRoleDetail.trim() || null,
      duesType: editDuesType,
      feeType,
      discountAmount: editDuesType === "discount" ? discountAmountParsed : null,
      discountLabel: editDuesType === "discount" ? editDiscountLabel.trim() || null : null,
    };
    setSavingEdit(true);
    try {
      await updateTeamMemberProfile(payload);
      setRows((prev) =>
        prev.map((row) =>
          row.memberDocId === editTarget.memberDocId
            ? {
                ...row,
                jerseyNumber: payload.jerseyNumber ?? undefined,
                birthYear: payload.birthYear ?? undefined,
                uniformSize: payload.uniformSize ?? undefined,
                position: payload.position ?? undefined,
                roleDetail: payload.roleDetail ?? undefined,
                note: editNote.trim() || undefined,
                duesType: payload.duesType ?? "monthly",
                discountAmount:
                  editDuesType === "discount" && Number.isFinite(discountAmountParsed)
                    ? discountAmountParsed
                    : undefined,
                discountLabel: editDuesType === "discount" ? editDiscountLabel.trim() || undefined : undefined,
              }
            : row
        )
      );
      setEditTarget(null);
      toast.success("멤버 정보를 저장했습니다.");
    } catch (error: unknown) {
      toast.error(errorMessageOf(error, "멤버 정보 저장에 실패했습니다."));
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleViceCaptain = async (m: Row) => {
    try {
      const isViceCaptain = String(m.roleDetail || "").trim() === "부팀장";
      const memberRef = doc(db, "teams", teamId, "members", m.memberDocId);
      await updateDoc(memberRef, {
        roleDetail: isViceCaptain ? "" : "부팀장",
      });
      setRows((prev) =>
        prev.map((row) =>
          row.memberDocId === m.memberDocId
            ? { ...row, roleDetail: isViceCaptain ? undefined : "부팀장" }
            : row
        )
      );
      toast.success(isViceCaptain ? "부팀장을 해제했습니다." : "부팀장으로 지정했습니다.");
      setActionTarget(null);
    } catch (error: unknown) {
      console.error("assign vice captain error", error);
      toast.error(errorMessageOf(error, "부팀장 지정/해제에 실패했습니다."));
    }
  };

  return (
    <div className="space-y-3">
      {isOwner && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="min-w-[12rem] flex-1 text-xs text-gray-600">
            멤버가 콘솔에는 있는데 여기만 적을 때 <strong>멤버 동기화</strong>를 눌러 주세요.
            <br />
            <span className="text-[11px] text-gray-500">
              PDF를 CSV로 잘못 올린 줄(`/CropBox` 등)은{" "}
              <strong>오류 데이터 일괄 제거</strong>로 한 번에 지울 수 있어요.
            </span>
          </p>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={() => void handleManualSync()}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1.5">멤버 동기화</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100"
              onClick={() => setCorruptBulkOpen(true)}
            >
              오류 데이터 일괄 제거
              {corruptGarbageMembers.length > 0
                ? ` (${corruptGarbageMembers.length})`
                : ""}
            </Button>
          </div>
        </div>
      )}
      {captain ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{captain.displayName}</p>
              <p className="text-xs text-gray-600">역할: 팀장</p>
              {isOwner && captain.phone ? (
                <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">{captain.phone}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
      {visibleMembers.map((m) => (
        <div
          key={m.memberDocId}
          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">{m.displayName}</p>
              {m.role && <p className="text-xs text-gray-500">역할: {m.role}</p>}
              {m.memberStatus === "invited" ? (
                <p className="text-xs font-medium text-amber-700">초대됨 · OTP 인증 후 연결</p>
              ) : null}
              {m.phone && (isOwner || m.memberStatus === "invited") ? (
                <p className="truncate font-mono text-[11px] text-gray-500">
                  {formatPhoneDigitsForDisplay(m.phone)}
                </p>
              ) : null}
              {(() => {
                const bits: string[] = [];
                if (m.jerseyNumber != null) bits.push(`배번 ${m.jerseyNumber}`);
                if (m.birthYear) bits.push(`${new Date().getFullYear() - m.birthYear + 1}세`);
                if (m.position) bits.push(m.position);
                if (m.roleDetail) bits.push(m.roleDetail);
                if (m.note) bits.push(m.note);
                if (bits.length === 0) return null;
                return <p className="truncate text-[11px] text-gray-500">{bits.join(" · ")}</p>;
              })()}
              {(m.duesType === "exempt" || m.duesType === "discount") && (
                <p className="truncate text-[11px] font-semibold text-indigo-700">
                  {m.duesType === "exempt"
                    ? "면제"
                    : `준회원${m.discountAmount ? ` (월 ${m.discountAmount.toLocaleString("ko-KR")}원)` : ""}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={() => void handleDelegateCaptain(m)}
              >
                <UserCheck className="mr-1 h-3 w-3" />
                팀장 위임
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 border-red-200"
              onClick={() => setActionTarget(m)}
              title="멤버 메뉴"
            >
              <MoreHorizontal className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      ))}
      </div>

      <Dialog open={corruptBulkOpen} onOpenChange={(open) => !open && !corruptBulkBusy && setCorruptBulkOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>오류 데이터 일괄 제거</DialogTitle>
            <DialogDescription>
              이름에 PDF·깨진 업로드 패턴이 있는 멤버만 골랐습니다. 계정이 연결된 멤버·팀장(관리) 줄은
              제외됩니다. 상단 <strong className="text-foreground">일괄 추가</strong>는 멤버를
              &quot;등록&quot;하는 버튼이며 삭제가 아닙니다.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium text-amber-900">
            자동 감지된 제거 대상: {corruptGarbageMembers.length}명
          </p>
          {corruptGarbageMembers.length === 0 ? (
            <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              패턴에 해당하는 줄이 없습니다. 페이지를 새로고침한 뒤 다시 열어 보거나, 각 줄 오른쪽{" "}
              <strong>⋯</strong> 메뉴에서 <strong>팀에서 내보내기</strong>로 한 명씩 제거해 주세요.
            </p>
          ) : (
            <ul className="max-h-48 list-inside list-disc overflow-y-auto rounded-md border border-amber-100 bg-amber-50/80 p-3 text-xs text-gray-800">
              {corruptGarbageMembers.slice(0, 30).map((m) => (
                <li key={m.memberDocId} className="truncate">
                  {m.displayName}
                </li>
              ))}
              {corruptGarbageMembers.length > 30 ? (
                <li className="text-gray-600">외 {corruptGarbageMembers.length - 30}명…</li>
              ) : null}
            </ul>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={corruptBulkBusy}
              onClick={() => setCorruptBulkOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={corruptBulkBusy || corruptGarbageMembers.length === 0}
              onClick={() => void handleBulkRemoveCorrupt()}
            >
              {corruptBulkBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중…
                </>
              ) : corruptGarbageMembers.length === 0 ? (
                "제거할 대상 없음"
              ) : (
                `${corruptGarbageMembers.length}명 제거`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent className="max-w-md">
          {actionTarget ? (
            <>
              <DialogHeader>
                <DialogTitle>{actionTarget.displayName}</DialogTitle>
                <DialogDescription>{`역할: ${actionTarget.role || "팀원"}`}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <button
                  type="button"
                  className="w-full text-left text-lg text-gray-900"
                  onClick={() => openEditModal(actionTarget)}
                >
                  멤버 정보 수정
                </button>
                <button
                  type="button"
                  className="w-full text-left text-lg text-gray-900"
                  onClick={() => void toggleViceCaptain(actionTarget)}
                >
                  {String(actionTarget.roleDetail || "").trim() === "부팀장"
                    ? "부팀장 해제"
                    : "부팀장으로 지정"}
                </button>
                <button
                  type="button"
                  className="w-full text-left text-lg text-gray-900"
                  onClick={() => void handleDelegateCaptain(actionTarget)}
                >
                  팀장 위임
                </button>
                <button
                  type="button"
                  className="w-full text-left text-lg text-red-600"
                  onClick={() => void handleRemoveMember(actionTarget)}
                >
                  팀에서 내보내기
                </button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-xl">
          {editTarget ? (
            <>
              <DialogHeader>
                <DialogTitle>멤버 수정</DialogTitle>
                <DialogDescription>
                  가입 완료 멤버는 Firebase 계정과 연결되어 전화번호를 여기서 바꿀 수 없습니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-md border border-violet-300 p-3">
                  <p className="mb-2 text-sm font-semibold">연락처(전화번호)</p>
                  <input
                    value={formatPhoneDigitsForDisplay(editPhone) || "—"}
                    readOnly
                    className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 font-mono text-sm"
                  />
                </div>
                <input
                  value={editJerseyNumber}
                  onChange={(e) => setEditJerseyNumber(e.target.value)}
                  placeholder="배번"
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                />
                <input
                  value={editBirthYear}
                  onChange={(e) => setEditBirthYear(e.target.value)}
                  placeholder="생년 (예: 1965)"
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                />
                <div className="rounded-md border border-gray-300 px-3 py-2">
                  <p className="mb-2 text-sm font-semibold text-gray-700">유니폼 사이즈</p>
                  <div className="flex flex-wrap gap-2">
                    {["S", "M", "L", "XL", "2XL"].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setEditUniformSize(editUniformSize === size ? "" : size)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          editUniformSize === size
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 text-gray-700"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-gray-300 px-3 py-2">
                  <p className="mb-2 text-sm font-semibold text-gray-700">포지션</p>
                  <div className="flex flex-wrap gap-2">
                    {["GK", "DF", "MF", "FW"].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setEditPosition(editPosition === pos ? "" : pos)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          editPosition === pos
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 text-gray-700"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  value={editRoleDetail}
                  onChange={(e) => setEditRoleDetail(e.target.value)}
                  placeholder="직위상세 (주장 등)"
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                />
                <input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="비고"
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                />
                <div className="rounded-md border border-gray-300 px-3 py-2">
                  <p className="mb-2 text-sm font-semibold text-gray-700">회비 유형</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditDuesType("monthly")}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        editDuesType === "monthly"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 text-gray-700"
                      }`}
                    >
                      월납
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDuesType("yearly")}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        editDuesType === "yearly"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 text-gray-700"
                      }`}
                    >
                      연납
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDuesType("exempt")}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        editDuesType === "exempt"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 text-gray-700"
                      }`}
                    >
                      면제
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDuesType("discount")}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        editDuesType === "discount"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 text-gray-700"
                      }`}
                    >
                      준회원
                    </button>
                  </div>
                </div>
                {editDuesType === "discount" ? (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <p className="text-xs font-semibold text-gray-700 md:col-span-2">준회원 월 회비 (원)</p>
                    <input
                      value={editDiscountAmount}
                      onChange={(e) => setEditDiscountAmount(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="예: 15000 (월 기준)"
                      inputMode="numeric"
                      aria-label="준회원 월 회비 (원)"
                      className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                    />
                    <input
                      value={editDiscountLabel}
                      onChange={(e) => setEditDiscountLabel(e.target.value)}
                      placeholder="라벨 (예: 학생, 코치)"
                      className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
                    />
                    <p className="text-xs text-gray-500 md:col-span-2">
                      준회원 월 회비는 월 기준으로 입력되며, 연납 계산에 자동 반영됩니다.
                    </p>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                  취소
                </Button>
                <Button type="button" onClick={() => void submitEdit()} disabled={savingEdit}>
                  {savingEdit ? "저장 중..." : "저장"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
