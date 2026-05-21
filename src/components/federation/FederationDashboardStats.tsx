import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";

type LogRow = {
  id: string;
  type?: string;
};

function getMemberCount(federationData: any): number {
  const uids = new Set<string>();

  const push = (v?: unknown) => {
    if (typeof v === "string" && v.trim()) uids.add(v);
  };

  push(federationData?.ownerUid);
  push(federationData?.ownerId);
  push(federationData?.owner?.uid);

  const roleArrays = [
    federationData?.roles?.admins,
    federationData?.roles?.editors,
    federationData?.roles?.viewers,
    federationData?.admins,
    federationData?.editors,
    federationData?.viewers,
    federationData?.adminIds,
    federationData?.editorIds,
    federationData?.viewerIds,
  ];
  roleArrays.forEach((arr) => {
    if (Array.isArray(arr)) arr.forEach((uid) => push(uid));
  });

  if (Array.isArray(federationData?.members)) {
    federationData.members.forEach((m: any) => push(m?.uid));
  }

  return uids.size;
}

export default function FederationDashboardStats({
  federationId,
  federationData,
}: {
  federationId: string;
  federationData?: any;
}) {
  const { canQuery } = useAuthForFirestore();
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    if (!federationId || !canQuery) return;
    const q = query(
      collection(db, "federations", federationId, "logs"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [federationId, canQuery]);

  const stats = useMemo(() => {
    const inviteCreated = logs.filter((l) => l.type === "INVITE_CREATED").length;
    const inviteAccepted = logs.filter((l) => l.type === "INVITE_ACCEPTED").length;
    const roleChanged = logs.filter((l) => l.type === "ROLE_CHANGED").length;
    const totalMembers = getMemberCount(federationData);
    return { inviteCreated, inviteAccepted, roleChanged, totalMembers };
  }, [logs, federationData]);

  const cards = [
    { label: "초대 생성", value: stats.inviteCreated, icon: "📨" },
    { label: "수락", value: stats.inviteAccepted, icon: "✅" },
    { label: "권한 변경", value: stats.roleChanged, icon: "🔄" },
    { label: "총 멤버", value: stats.totalMembers, icon: "👥" },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">협회 상태 요약</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <span>{card.icon}</span>
              <span>{card.label}</span>
            </div>
            <div className="text-xl font-bold text-gray-900 mt-1">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

