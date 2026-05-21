import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logEvent } from "@/lib/logging/logEvent";

type FederationLike = {
  ownerUid?: string;
  ownerId?: string;
  admins?: Array<{ uid: string; phone?: string | null; role?: string }>;
  editors?: Array<{ uid: string; phone?: string | null; role?: string }>;
  roles?: { admins?: string[]; editors?: string[] };
  adminIds?: string[];
  adminUids?: string[];
  editorIds?: string[];
};

export default function FederationMemberList({
  federationId,
  data,
}: {
  federationId: string;
  data: FederationLike | null | undefined;
}) {
  const { user } = useAuth();
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const ownerUid = (data?.ownerUid || data?.ownerId || "").trim?.() || "";
  const adminUids = useMemo(() => {
    const s = new Set<string>();
    (Array.isArray(data?.roles?.admins) ? data!.roles!.admins! : []).forEach((x) => s.add(String(x)));
    (Array.isArray(data?.adminIds) ? data!.adminIds! : []).forEach((x) => s.add(String(x)));
    (Array.isArray(data?.adminUids) ? data!.adminUids! : []).forEach((x) => s.add(String(x)));
    // 레거시 객체 배열도 지원
    (Array.isArray(data?.admins) ? data!.admins! : []).forEach((m) => m?.uid && s.add(String(m.uid)));
    s.delete(""); // 정리
    return Array.from(s);
  }, [data]);

  const editorUids = useMemo(() => {
    const s = new Set<string>();
    (Array.isArray(data?.roles?.editors) ? data!.roles!.editors! : []).forEach((x) => s.add(String(x)));
    (Array.isArray(data?.editorIds) ? data!.editorIds! : []).forEach((x) => s.add(String(x)));
    (Array.isArray(data?.editors) ? data!.editors! : []).forEach((m) => m?.uid && s.add(String(m.uid)));
    s.delete("");
    // owner는 편집자 목록에서 제외
    s.delete(ownerUid);
    return Array.from(s);
  }, [data, ownerUid]);

  const rows = useMemo(() => {
    const list: Array<{ uid: string; role: "admin" | "editor"; phone?: string | null }> = [];
    adminUids.forEach((uid) => list.push({ uid, role: "admin" }));
    editorUids.forEach((uid) => {
      if (!adminUids.includes(uid)) list.push({ uid, role: "editor" });
    });
    // phone 표시를 위해 레거시 배열에서 매칭
    const phoneMap = new Map<string, string | null>();
    (Array.isArray(data?.admins) ? data!.admins! : []).forEach((m) => {
      if (m?.uid) phoneMap.set(String(m.uid), m.phone ?? null);
    });
    (Array.isArray(data?.editors) ? data!.editors! : []).forEach((m) => {
      if (m?.uid) phoneMap.set(String(m.uid), m.phone ?? null);
    });
    return list.map((r) => ({ ...r, phone: phoneMap.get(r.uid) ?? null }));
  }, [adminUids, editorUids, data]);

  const ensureArrays = (uids: string[]) => Array.from(new Set(uids.filter((x) => typeof x === "string" && x)));

  const applyRoleUpdate = async (uid: string, newRole: "admin" | "editor") => {
    if (!uid) return;
    if (uid === ownerUid) {
      toast.error("owner는 변경/삭제할 수 없습니다.");
      return;
    }
    if (uid === user?.uid) {
      toast.error("자기 자신은 여기서 변경/삭제할 수 없습니다.");
      return;
    }
    setBusyUid(uid);
    try {
      let nextAdmins = adminUids.filter((x) => x !== uid);
      let nextEditors = editorUids.filter((x) => x !== uid);
      if (newRole === "admin") nextAdmins.push(uid);
      else nextEditors.push(uid);
      nextAdmins = ensureArrays(nextAdmins);
      nextEditors = ensureArrays(nextEditors);

      await updateDoc(doc(db, "federations", federationId), {
        "roles.admins": nextAdmins,
        "roles.editors": nextEditors,
        // 레거시 호환
        adminIds: nextAdmins,
        adminUids: nextAdmins,
        editorIds: nextEditors,
        updatedAt: new Date(),
      } as any);
      if (user?.uid) {
        await logEvent({
          federationId,
          type: "ROLE_CHANGED",
          actorId: user.uid,
          targetId: uid,
          metadata: { role: newRole },
        });
      }
      toast.success("권한을 변경했습니다.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "권한 변경에 실패했습니다.");
    } finally {
      setBusyUid(null);
    }
  };

  const removeMember = async (uid: string) => {
    if (!uid) return;
    if (uid === ownerUid) {
      toast.error("owner는 삭제할 수 없습니다.");
      return;
    }
    if (uid === user?.uid) {
      toast.error("자기 자신은 여기서 삭제할 수 없습니다.");
      return;
    }
    if (!confirm("해당 관리자를 제거할까요?")) return;
    setBusyUid(uid);
    try {
      const nextAdmins = ensureArrays(adminUids.filter((x) => x !== uid));
      const nextEditors = ensureArrays(editorUids.filter((x) => x !== uid));
      await updateDoc(doc(db, "federations", federationId), {
        "roles.admins": nextAdmins,
        "roles.editors": nextEditors,
        adminIds: nextAdmins,
        adminUids: nextAdmins,
        editorIds: nextEditors,
        updatedAt: new Date(),
      } as any);
      if (user?.uid) {
        await logEvent({
          federationId,
          type: "ROLE_CHANGED",
          actorId: user.uid,
          targetId: uid,
          metadata: { action: "removed" },
        });
      }
      toast.success("관리자를 제거했습니다.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "제거에 실패했습니다.");
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">권한 관리</h2>
      <div className="text-xs text-gray-500">owner: {ownerUid || "-"}</div>
      <div className="divide-y">
        {rows.length === 0 ? (
          <div className="py-6 text-sm text-gray-500">등록된 관리자가 없습니다.</div>
        ) : (
          rows.map((m) => (
            <div key={`${m.uid}`} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{m.uid}</div>
                <div className="text-xs text-gray-500">{m.phone || "-"}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={m.role}
                  disabled={busyUid === m.uid}
                  onChange={(e) => void applyRoleUpdate(m.uid, e.target.value as any)}
                >
                  <option value="editor">editor</option>
                  <option value="admin">admin</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyUid === m.uid}
                  onClick={() => void removeMember(m.uid)}
                >
                  제거
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

