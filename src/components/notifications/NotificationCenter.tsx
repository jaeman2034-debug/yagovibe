import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";
import { Bell } from "lucide-react";

type LogRow = {
  id: string;
  type: "INVITE_CREATED" | "INVITE_ACCEPTED" | "ROLE_CHANGED" | string;
  actorId: string;
  targetId?: string | null;
  metadata?: Record<string, any>;
  createdAt?: any;
  readBy?: Record<string, boolean>;
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

export default function NotificationCenter({
  federationId,
  currentUserId,
}: {
  federationId: string;
  currentUserId?: string | null;
}) {
  const { canQuery } = useAuthForFirestore();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LogRow[]>([]);
  const nameByUidRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!federationId || !canQuery) return;
    const q = query(
      collection(db, "federations", federationId, "logs"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [federationId, canQuery]);

  useEffect(() => {
    if (!canQuery) return;
    const loadNames = async () => {
      const uids = Array.from(
        new Set(
          rows.flatMap((r) => [r.actorId, r.targetId]).filter((v): v is string => !!v)
        )
      );
      const unknown = uids.filter((uid) => !nameByUidRef.current[uid]);
      if (unknown.length === 0) return;
      for (let i = 0; i < unknown.length; i += 10) {
        const chunk = unknown.slice(i, i + 10);
        const q = query(collection(db, "users"), where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const d = docSnap.data() as any;
          nameByUidRef.current[docSnap.id] = String(d?.displayName || d?.name || d?.nickname || docSnap.id);
        });
      }
    };
    void loadNames();
  }, [rows, canQuery]);

  const formatLine = (row: LogRow) => {
    const actor = nameByUidRef.current[row.actorId] || row.actorId || "알 수 없음";
    const target = row.targetId ? (nameByUidRef.current[row.targetId] || row.targetId) : "";
    const role = String(row.metadata?.role || "editor");
    if (row.type === "INVITE_CREATED") {
      return `${actor}님이 ${role} 권한으로 초대했습니다`;
    }
    if (row.type === "INVITE_ACCEPTED") {
      return `${actor}님이 협회에 참여했습니다`;
    }
    if (row.type === "ROLE_CHANGED") {
      if (row.metadata?.action === "removed") {
        return `${actor}님이 ${target}님을 관리자 목록에서 제거했습니다`;
      }
      return `${actor}님이 권한을 변경했습니다`;
    }
    return `${actor}님의 새로운 활동이 있습니다`;
  };

  const unreadCount = useMemo(() => {
    if (!currentUserId) return 0;
    return rows.filter((r) => !r.readBy?.[currentUserId]).length;
  }, [rows, currentUserId]);

  const markAsRead = async (rowId: string) => {
    if (!currentUserId) return;
    try {
      await updateDoc(doc(db, "federations", federationId, "logs", rowId), {
        [`readBy.${currentUserId}`]: true,
      } as any);
    } catch (e) {
      // no-op: UX 저해 방지
      // console.error("markAsRead failed", e);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    const visible = rows.map((r) => r.id);
    for (const id of visible) {
      try {
        await updateDoc(doc(db, "federations", federationId, "logs", id), {
          [`readBy.${currentUserId}`]: true,
        } as any);
      } catch {}
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center rounded-lg px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50"
        aria-label="알림"
      >
        <Bell className="w-4 h-4 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="text-sm font-semibold text-gray-900">알림</div>
            <button
              onClick={() => void markAllAsRead()}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              모두 읽음
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {rows.length === 0 ? (
              <div className="text-sm text-gray-500 px-3 py-6 text-center">알림이 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => {
                  const unread = currentUserId ? !r.readBy?.[currentUserId] : false;
                  return (
                    <li
                      key={r.id}
                      onClick={() => void markAsRead(r.id)}
                      className={`rounded-lg px-3 py-2 border ${
                        unread ? "border-primary-200 bg-primary-50" : "border-gray-200 bg-white"
                      } cursor-pointer hover:bg-gray-50`}
                    >
                      <div className="flex items-start gap-2">
                        {unread ? <span className="mt-1 w-2 h-2 rounded-full bg-primary-600" /> : <span className="mt-1 w-2 h-2" />}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${unread ? "font-semibold text-gray-900" : "text-gray-800"}`}>
                            {formatLine(r)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{timeAgo(r.createdAt)}</div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

