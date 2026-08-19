import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  cancelFederationOwnershipTransfer,
  confirmFederationOwnershipTransfer,
  federationInviteAbsoluteUrl,
  proposeFederationOwnershipTransfer,
  type PendingOwnershipTransfer,
} from "@/services/inviteService";
import { shareFederationInviteViaKakao } from "@/services/kakaoShare";
import { isRunningOnLoopbackHost } from "@/lib/growth/teamInviteShare";

export type OwnerHistoryEntry = {
  fromUid?: string | null;
  toUid?: string;
  transferredAt?: string | { seconds?: number; toDate?: () => Date };
  transferredBy?: string;
  reason?: string | null;
  mode?: string;
  status?: string;
  previousAdmins?: string[];
  newAdmins?: string[];
  previousOwnerUid?: string | null;
  newOwnerUid?: string;
};

type Props = {
  federationSlug: string;
  ownerUid?: string | null;
  ownerId?: string | null;
  ownerTransferredAt?: unknown;
  ownerTransferredBy?: string | null;
  ownerHistory?: OwnerHistoryEntry[] | null;
  pendingOwnershipTransfer?: PendingOwnershipTransfer | null;
  ownershipTransferHold?: boolean | null;
  onTransferred?: () => void;
};

const DEFAULT_HOLD_SLUGS = new Set(["nowon-football"]);

function formatTs(v: unknown): string {
  if (!v) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v && "toDate" in v && typeof (v as any).toDate === "function") {
    try {
      return (v as { toDate: () => Date }).toDate().toLocaleString("ko-KR");
    } catch {
      return "—";
    }
  }
  if (typeof v === "object" && v && "seconds" in v) {
    const s = Number((v as { seconds?: number }).seconds || 0);
    if (s) return new Date(s * 1000).toLocaleString("ko-KR");
  }
  return String(v);
}

function isHold(slug: string, holdFlag: boolean | null | undefined): boolean {
  if (holdFlag === false) return false;
  if (holdFlag === true) return true;
  return DEFAULT_HOLD_SLUGS.has(slug);
}

export default function FederationOwnershipPanel({
  federationSlug,
  ownerUid,
  ownerId,
  ownerTransferredAt,
  ownerTransferredBy,
  ownerHistory,
  pendingOwnershipTransfer,
  ownershipTransferHold,
  onTransferred,
}: Props) {
  const [newOwnerUid, setNewOwnerUid] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState("");

  const hold = isHold(federationSlug, ownershipTransferHold);
  const currentOwner = String(ownerUid || ownerId || "").trim() || "(미지정)";
  const pending = pendingOwnershipTransfer || null;
  const pendingStatus = String(pending?.status || "");
  const pendingActive = pendingStatus === "invited" || pendingStatus === "accepted";

  const history = useMemo(() => {
    const rows = Array.isArray(ownerHistory) ? [...ownerHistory] : [];
    return rows.reverse();
  }, [ownerHistory]);

  const onPropose = async () => {
    const target = newOwnerUid.trim();
    if (!target) {
      toast.error("새 Owner UID를 입력하세요.");
      return;
    }
    if (target === String(ownerUid || ownerId || "").trim()) {
      toast.error("현재 Owner와 동일합니다.");
      return;
    }
    if (
      !confirm(
        `새 Federation Owner로 ${target} 를 지정하고 초대를 발송할까요?\n(수락 + 최종 승인 후에만 ownerUid가 변경됩니다)`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await proposeFederationOwnershipTransfer({
        federationSlug,
        newOwnerUid: target,
        reason: reason.trim() || undefined,
      });
      const link = federationInviteAbsoluteUrl(res.inviteLink);
      setLastInviteLink(link);
      try {
        await navigator.clipboard.writeText(link);
        toast.success("초대 링크 복사 완료 — 카톡에 붙여넣기 하세요.");
      } catch {
        toast.success("초대가 생성되었습니다. 아래 링크를 전달하세요.");
      }
      // 프로덕션에서만 카카오 피드 공유 (localhost SDK가 링크를 깨뜨림)
      if (!isRunningOnLoopbackHost()) {
        try {
          await shareFederationInviteViaKakao({
            link,
            federationName: federationSlug,
          });
          toast.message(`카카오 공유 링크 확인: ${link}`);
        } catch (kakaoErr: any) {
          console.warn("[Ownership] Kakao share skipped/failed:", kakaoErr);
          toast.message(
            "카카오 SDK 공유 실패 — 복사된 https://yago-vibe-spt.web.app/invite?token=… 링크를 카톡에 직접 보내세요."
          );
        }
      } else {
        toast.message(
          "localhost에서는 카카오 공유 불가. 복사된 web.app 링크만 카톡으로 전달하세요."
        );
      }
      setNewOwnerUid("");
      onTransferred?.();
    } catch (e: any) {
      console.error(e);
      toast.error(String(e?.message || e?.code || "Propose 실패"));
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (
      !confirm(
        "최종 승인하시겠습니까?\nownerUid가 변경됩니다.\nPlatform Super Admin Emergency 권한은 유지됩니다."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await confirmFederationOwnershipTransfer({ federationSlug });
      toast.success(`Owner 확정 → ${res.ownerUid} (Platform Admin 최고 권한 유지)`);
      setLastInviteLink("");
      onTransferred?.();
    } catch (e: any) {
      console.error(e);
      toast.error(String(e?.message || e?.code || "최종 승인 실패"));
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    if (!confirm("진행 중인 Ownership Transfer를 취소할까요?")) return;
    setBusy(true);
    try {
      await cancelFederationOwnershipTransfer({ federationSlug });
      toast.success("Transfer를 취소했습니다.");
      setLastInviteLink("");
      onTransferred?.();
    } catch (e: any) {
      console.error(e);
      toast.error(String(e?.message || e?.code || "취소 실패"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Federation Ownership</h2>
        <p className="text-xs text-gray-500 mt-1">
          Platform Super Admin 전용 · 2단계 승인(제안→수락→최종 승인).
          Transfer 후에도 <strong>Platform Admin &gt; Federation Owner</strong> 계층은 유지됩니다.
        </p>
      </div>

      {hold && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>HOLD</strong> — 회장 확정 전 Transfer 비활성
          {federationSlug === "nowon-football" ? " (nowon-football)" : ""}.
          해제: <code className="text-xs">ownershipTransferHold: false</code>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-gray-50 border px-3 py-2">
          <div className="text-xs text-gray-500">현재 Federation Owner</div>
          <div className="font-mono text-gray-900 break-all">{currentOwner}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            Platform Super Admin Emergency 권한은 Owner와 별개로 항상 유지
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 border px-3 py-2">
          <div className="text-xs text-gray-500">마지막 이관</div>
          <div className="text-gray-800">{formatTs(ownerTransferredAt)}</div>
          <div className="font-mono text-xs text-gray-500 break-all">
            by {ownerTransferredBy || "—"}
          </div>
        </div>
      </div>

      {pendingActive && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 space-y-2 text-sm">
          <div className="font-semibold text-blue-900">Pending Transfer</div>
          <div className="font-mono text-xs break-all">toUid: {pending?.toUid || "—"}</div>
          <div>
            status:{" "}
            <span className="font-semibold">
              {pendingStatus === "invited" ? "초대 발송 · 수락 대기" : "수락 완료 · 최종 승인 대기"}
            </span>
          </div>
          {pending?.reason ? <div className="text-xs text-gray-600">reason: {pending.reason}</div> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => void onConfirm()}
              disabled={busy || hold || pendingStatus !== "accepted"}
            >
              {busy ? "처리 중..." : "최종 승인 (Confirm)"}
            </Button>
            <Button variant="outline" onClick={() => void onCancel()} disabled={busy}>
              취소
            </Button>
          </div>
          {pendingStatus === "invited" && (
            <p className="text-xs text-blue-800">새 Owner가 초대를 수락하기 전에는 Confirm할 수 없습니다.</p>
          )}
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-800">① 새 Owner 지정 + 초대 발송</h3>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          placeholder="newOwnerUid (Firebase Auth UID)"
          value={newOwnerUid}
          onChange={(e) => setNewOwnerUid(e.target.value)}
          disabled={busy || hold || pendingActive}
        />
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="reason (선택)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy || hold || pendingActive}
        />
        <Button
          onClick={() => void onPropose()}
          disabled={busy || hold || pendingActive || !newOwnerUid.trim()}
        >
          {busy ? "처리 중..." : "Propose + 초대 발송"}
        </Button>
        {lastInviteLink ? (
          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-xs font-semibold text-emerald-900">수신자가 열 링크 (이 형태만 유효)</p>
            <p className="text-xs font-mono break-all text-gray-800">{lastInviteLink}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(lastInviteLink);
                    toast.success("다시 복사했습니다.");
                  } catch {
                    toast.error("복사 실패");
                  }
                }}
              >
                링크 다시 복사
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => window.open(lastInviteLink, "_blank", "noopener,noreferrer")}
              >
                새 탭에서 연결 테스트
              </Button>
            </div>
            <p className="text-[11px] text-emerald-800">
              localhost / https://yagovibe.com(apex) 링크는 수신 폰에서 연결되지 않습니다. 카카오
              Developers에 <code>yago-vibe-spt.web.app</code> 도메인이 등록돼 있어야 「참여하기」
              버튼이 플랫폼으로 열립니다.
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-800">Owner History</h3>
        {history.length === 0 ? (
          <p className="text-xs text-gray-500">
            이관 이력 없음 (현재 Platform Admin = Owner 겸임 가능).
          </p>
        ) : (
          <ul className="space-y-2 text-xs">
            {history.map((h, i) => (
              <li key={`${h.toUid}-${i}`} className="rounded border bg-gray-50 px-3 py-2 font-mono">
                <div>
                  {h.fromUid || h.previousOwnerUid || "(null)"} → {h.toUid || h.newOwnerUid}
                  {h.status ? ` · ${h.status}` : ""}
                </div>
                <div className="text-gray-500">
                  {typeof h.transferredAt === "string"
                    ? h.transferredAt
                    : formatTs(h.transferredAt)}{" "}
                  · by {h.transferredBy || "—"}
                  {h.mode ? ` · ${h.mode}` : ""}
                  {h.reason ? ` · ${h.reason}` : ""}
                </div>
                {(h.previousAdmins?.length || h.newAdmins?.length) ? (
                  <div className="text-[11px] text-gray-500 mt-1 break-all">
                    admins: [{(h.previousAdmins || []).join(", ") || "—"}] → [
                    {(h.newAdmins || []).join(", ") || "—"}]
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
