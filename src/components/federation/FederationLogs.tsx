import { useEffect, useState } from "react";
import { collection, documentId, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";

type LogRow = {
  id: string;
  type: "INVITE_CREATED" | "INVITE_ACCEPTED" | "ROLE_CHANGED" | string;
  actorId: string;
  targetId?: string | null;
  metadata?: Record<string, any>;
  createdAt?: any;
};
type LogFilter = "ALL" | "INVITE_CREATED" | "INVITE_ACCEPTED" | "ROLE_CHANGED";

function formatLog(
  row: LogRow,
  nameByUid: Record<string, string>
): string {
  const actorName = nameByUid[row.actorId] || row.actorId;
  const targetName = row.targetId ? (nameByUid[row.targetId] || row.targetId) : row.targetId;
  if (row.type === "INVITE_CREATED") {
    return `[초대 생성] ${actorName} 님이 ${row.metadata?.role || "editor"} 권한으로 초대했습니다.`;
  }
  if (row.type === "INVITE_ACCEPTED") {
    return `[초대 수락] ${actorName} 님이 초대를 수락했습니다.`;
  }
  if (row.type === "ROLE_CHANGED") {
    if (row.metadata?.action === "removed") {
      return `[권한 변경] ${actorName} 님이 ${targetName} 님을 관리자 목록에서 제거했습니다.`;
    }
    return `[권한 변경] ${actorName} 님이 ${targetName} 님 권한을 ${row.metadata?.role || "-"} 로 변경했습니다.`;
  }
  return `[로그] ${row.type}`;
}

export default function FederationLogs({ federationId }: { federationId: string }) {
  const { canQuery } = useAuthForFirestore();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [nameByUid, setNameByUid] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<LogFilter>("ALL");

  useEffect(() => {
    if (!canQuery) return;
    const logRef = collection(db, "federations", federationId, "logs");
    const q =
      filter === "ALL"
        ? query(logRef, orderBy("createdAt", "desc"))
        : query(logRef, where("type", "==", filter), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (error) => {
        console.error("❌ [FederationLogs] onSnapshot error:", {
          federationId,
          filter,
          error,
        });
      }
    );
    return () => unsub();
  }, [federationId, filter, canQuery]);

  useEffect(() => {
    const loadNames = async () => {
      const uids = Array.from(
        new Set(
          logs.flatMap((row) => [row.actorId, row.targetId]).filter((v): v is string => !!v)
        )
      );
      const unknown = uids.filter((uid) => !nameByUid[uid]);
      if (unknown.length === 0) return;

      const nextMap: Record<string, string> = {};
      // Firestore "in" 최대 10개 제한
      for (let i = 0; i < unknown.length; i += 10) {
        const chunk = unknown.slice(i, i + 10);
        const q = query(collection(db, "users"), where(documentId(), "in", chunk));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const d = docSnap.data() as any;
          nextMap[docSnap.id] = String(d?.displayName || d?.name || d?.nickname || docSnap.id);
        });
      }
      if (Object.keys(nextMap).length > 0) {
        setNameByUid((prev) => ({ ...prev, ...nextMap }));
      }
    };
    void loadNames();
  }, [logs, nameByUid, canQuery]);

  useEffect(() => {
    console.log("🔥 [FederationLogs] logs state:", logs);
  }, [logs]);

  const handleDownloadCsv = () => {
    const header = ["createdAt", "type", "actorName", "targetName", "role", "action"];
    const rows = logs.map((row) => {
      const actorName = nameByUid[row.actorId] || row.actorId || "";
      const targetName = row.targetId ? nameByUid[row.targetId] || row.targetId : "";
      const createdAt =
        row.createdAt?.toDate instanceof Function
          ? row.createdAt.toDate().toISOString()
          : "";
      const role = row.metadata?.role ? String(row.metadata.role) : "";
      const action = row.metadata?.action ? String(row.metadata.action) : "";
      return [createdAt, row.type || "", actorName, targetName, role, action];
    });

    const escapeCell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...rows]
      .map((cols) => cols.map((c) => escapeCell(String(c))).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `federation-logs-${federationId}-${filter.toLowerCase()}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">활동 로그</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-2.5 py-1 rounded text-xs border bg-white text-gray-700 border-gray-300"
            disabled={logs.length === 0}
          >
            CSV 다운로드
          </button>
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded text-xs border ${
              filter === "ALL" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => setFilter("INVITE_CREATED")}
            className={`px-2.5 py-1 rounded text-xs border ${
              filter === "INVITE_CREATED" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            초대
          </button>
          <button
            type="button"
            onClick={() => setFilter("INVITE_ACCEPTED")}
            className={`px-2.5 py-1 rounded text-xs border ${
              filter === "INVITE_ACCEPTED" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            수락
          </button>
          <button
            type="button"
            onClick={() => setFilter("ROLE_CHANGED")}
            className={`px-2.5 py-1 rounded text-xs border ${
              filter === "ROLE_CHANGED" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"
            }`}
          >
            권한
          </button>
        </div>
      </div>
      {logs.length === 0 ? (
        <div className="text-sm text-gray-500">
          {filter === "ALL" ? "아직 로그가 없습니다." : "선택한 필터에 해당하는 로그가 없습니다."}
        </div>
      ) : (
        <div className="space-y-2">
          {logs.slice(0, 50).map((row) => (
            <div key={row.id} className="border rounded-lg px-3 py-2">
              <div className="text-sm text-gray-800">{formatLog(row, nameByUid)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {row.createdAt?.toDate ? row.createdAt.toDate().toLocaleString() : "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

