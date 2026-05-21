import { useEffect, useMemo, useState } from "react";
import { collection, documentId, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";

type ActivityRow = {
  id: string;
  type: "INVITE_CREATED" | "INVITE_ACCEPTED" | "ROLE_CHANGED" | string;
  actorId: string;
  targetId?: string | null;
  metadata?: Record<string, any>;
  createdAt?: any;
};

function timeAgo(ts: any): string {
  const d = ts?.toDate instanceof Function ? ts.toDate() as Date : null;
  if (!d) return "-";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

function lineOf(row: ActivityRow, nameByUid: Record<string, string>): string {
  const actor = nameByUid[row.actorId] || row.actorId || "알 수 없음";
  const target = row.targetId ? (nameByUid[row.targetId] || row.targetId) : "";
  if (row.type === "INVITE_CREATED") {
    return `${actor}님이 ${row.metadata?.role || "editor"} 권한으로 초대했습니다.`;
  }
  if (row.type === "INVITE_ACCEPTED") {
    return `${actor}님이 협회에 참여했습니다.`;
  }
  if (row.type === "ROLE_CHANGED") {
    if (row.metadata?.action === "removed") {
      return `${actor}님이 ${target}님을 관리자 목록에서 제거했습니다.`;
    }
    return `${actor}님이 ${target}님 권한을 ${row.metadata?.role || "-"}로 변경했습니다.`;
  }
  return `${actor}님이 활동을 수행했습니다.`;
}

export default function FederationActivityFeed({ federationId }: { federationId: string }) {
  const { canQuery } = useAuthForFirestore();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [nameByUid, setNameByUid] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canQuery) return;
    const q = query(
      collection(db, "federations", federationId, "logs"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [federationId, canQuery]);

  useEffect(() => {
    const loadNames = async () => {
      const uids = Array.from(new Set(rows.flatMap((r) => [r.actorId, r.targetId]).filter((v): v is string => !!v)));
      const unknown = uids.filter((uid) => !nameByUid[uid]);
      if (unknown.length === 0) return;
      const map: Record<string, string> = {};
      for (let i = 0; i < unknown.length; i += 10) {
        const chunk = unknown.slice(i, i + 10);
        const q = query(collection(db, "users"), where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const d = docSnap.data() as any;
          map[docSnap.id] = String(d?.displayName || d?.name || d?.nickname || docSnap.id);
        });
      }
      if (Object.keys(map).length > 0) setNameByUid((prev) => ({ ...prev, ...map }));
    };
    void loadNames();
  }, [rows, nameByUid, canQuery]);

  const items = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        text: lineOf(r, nameByUid),
        ago: timeAgo(r.createdAt),
      })),
    [rows, nameByUid]
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">최근 활동</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">최근 활동이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="border rounded-lg px-3 py-2">
              <div className="text-sm text-gray-800">{it.text}</div>
              <div className="text-xs text-gray-500 mt-1">{it.ago}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

