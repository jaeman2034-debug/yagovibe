import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { inviteFederationByPhone, listFederationInvites, removeFederationInvite } from "@/services/federationInvitePhoneService";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { logEvent } from "@/lib/logging/logEvent";

export default function FederationInviteManager({ federationId }: { federationId: string }) {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("admin");
  const [invites, setInvites] = useState<Array<{ id: string; phone: string; role: "admin" | "editor"; status: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const disabled = useMemo(() => {
    const digits = phone.replace(/\D+/g, "");
    return creating || digits.length < 10;
  }, [phone, creating]);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listFederationInvites(federationId);
      setInvites(rows.sort((a, b) => (String(b.createdAt || 0) > String(a.createdAt || 0) ? 1 : -1)));
    } catch (e) {
      console.error(e);
      toast.error("초대 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [federationId]);

  const onCreate = async () => {
    try {
      setCreating(true);
      const res = await inviteFederationByPhone(federationId, phone, role);
      const inviteLink = res.inviteLink;
      console.log("🔥 inviteLink:", inviteLink);
      if (res.smsSent) {
        toast.success("초대를 생성하고 SMS를 발송했습니다.");
      } else {
        try {
          await navigator.clipboard.writeText(inviteLink);
          toast.warning("초대는 저장되었지만 SMS 발송에 실패했습니다. 초대 링크를 클립보드에 복사했습니다.");
        } catch {
          toast.warning(`초대는 저장되었지만 SMS 발송에 실패했습니다. 링크: ${inviteLink}`);
        }
        console.warn("[FederationInviteManager] SMS failed, fallback invite link:", inviteLink, res.smsError);
      }
      if (!res.smsSent) {
        // 목록에는 pending으로 보이므로 바로 테스트 가능
        await load();
      } else {
        // 성공 케이스도 최신화
        await load();
      }
      console.log("[FederationInviteManager] invite create result:", res);
      if (user?.uid) {
        await logEvent({
          federationId,
          type: "INVITE_CREATED",
          actorId: user.uid,
          metadata: {
            role,
            phone,
            inviteId: res.inviteId,
            smsSent: res.smsSent,
          },
        });
      }
      setPhone("");
    } catch (e) {
      console.error(e);
      const msg = (e as any)?.code || (e as any)?.message || "";
      if (String(msg).includes("permission-denied")) {
        toast.error("권한 문제로 초대 저장이 실패했습니다. (federations/{id}/invites write 확인)");
      } else {
        toast.error("초대 생성에 실패했습니다.");
      }
    } finally {
      setCreating(false);
    }
  };

  const onRemove = async (inviteId: string) => {
    if (!confirm("이 초대를 삭제할까요?")) return;
    try {
      await removeFederationInvite(federationId, inviteId);
      toast.success("초대를 삭제했습니다.");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">관리자 초대 (전화번호)</h3>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-3">
        <input
          type="tel"
          placeholder="01012345678"
          className="w-full sm:w-64 border rounded px-3 py-2 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <select
          className="w-full sm:w-36 border rounded px-3 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          <option value="admin">admin</option>
          <option value="editor">editor</option>
        </select>
        <Button type="button" onClick={() => void onCreate()} disabled={disabled}>
          {creating ? "초대 중..." : "초대"}
        </Button>
      </div>

      <div className="border-t pt-3">
        <div className="text-xs text-gray-500 mb-2">{loading ? "불러오는 중..." : `총 ${invites.length}건`}</div>
        <div className="space-y-2">
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between border rounded px-3 py-2">
              <div className="text-sm">
                <span className="font-medium mr-2">{inv.phone}</span>
                <span className="text-gray-600 mr-2">({inv.role})</span>
                <span className={inv.status === "pending" ? "text-orange-600" : inv.status === "accepted" ? "text-emerald-600" : "text-gray-500"}>
                  {inv.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void onRemove(inv.id)}>
                  삭제
                </Button>
              </div>
            </div>
          ))}
          {invites.length === 0 && !loading ? <div className="text-sm text-gray-500">초대가 없습니다.</div> : null}
        </div>
      </div>
    </div>
  );
}

