import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isAdmin, isOwner, type AssociationMember, type AssociationRole } from "@/utils/permissions";
import { softDeleteAssociation } from "@/services/associationService";
import {
  createAssociationInvite,
  listAssociationInvites,
  removeAssociationInvite,
  type AssociationInviteDoc,
} from "@/services/associationInviteService";
import {
  listPendingJoinRequests,
  updateJoinRequestStatus,
  type JoinRequestDoc,
} from "@/services/associationJoinRequestService";
import { createAssociationNotification } from "@/services/associationNotificationService";
import { buildExternalUrl } from "@/lib/growth/teamInviteShare";

type TabKey = "basic" | "members" | "joinRequests" | "invites" | "roles" | "danger";

interface AssociationData {
  id: string;
  name: string;
  sport?: string;
  region?: string;
  description?: string;
  ownerUid?: string;
  ownerId?: string;
  deleted?: boolean;
  members?: AssociationMember[];
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "basic", label: "기본 정보" },
  { key: "members", label: "멤버 관리" },
  { key: "joinRequests", label: "가입 요청 관리" },
  { key: "invites", label: "초대 관리" },
  { key: "roles", label: "권한 관리" },
  { key: "danger", label: "위험 작업" },
];

export default function AssociationSettingsPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<TabKey>("basic");

  const [association, setAssociation] = useState<AssociationData | null>(null);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("축구");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");

  const [members, setMembers] = useState<AssociationMember[]>([]);
  const [newMemberUid, setNewMemberUid] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteLink, setInviteLink] = useState("");
  const [invites, setInvites] = useState<AssociationInviteDoc[]>([]);
  const [inviteFilter, setInviteFilter] = useState<"all" | "active" | "expired" | "used">("all");
  const [joinRequests, setJoinRequests] = useState<JoinRequestDoc[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!associationId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "associations", associationId));
        if (!snap.exists()) {
          setAssociation(null);
          return;
        }

        const data = snap.data() as Omit<AssociationData, "id">;
        const normalizedMembers = data.members && data.members.length > 0
          ? data.members
          : data.ownerUid || data.ownerId
            ? [{ uid: (data.ownerUid || data.ownerId) as string, role: "owner" as const }]
            : [];

        const assoc: AssociationData = {
          id: snap.id,
          ...data,
          members: normalizedMembers,
        };

        setAssociation(assoc);
        setName(assoc.name || "");
        setSport(assoc.sport || "축구");
        setRegion(assoc.region || "");
        setDescription(assoc.description || "");
        setMembers(normalizedMembers);
      } catch (error) {
        console.error("[AssociationSettingsPage] 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [associationId]);

  const canAdmin = useMemo(() => isAdmin(association, user?.uid), [association, user?.uid]);
  const canOwner = useMemo(() => isOwner(association, user?.uid), [association, user?.uid]);

  useEffect(() => {
    const run = async () => {
      if (!associationId || !canAdmin) return;
      try {
        const items = await listAssociationInvites(associationId);
        setInvites(items);
      } catch (error) {
        console.error("[AssociationSettingsPage] 초대 목록 조회 실패:", error);
      }
    };
    void run();
  }, [associationId, canAdmin]);

  useEffect(() => {
    const run = async () => {
      if (!associationId || !canAdmin) return;
      try {
        const items = await listPendingJoinRequests(associationId);
        setJoinRequests(items);
      } catch (error) {
        console.error("[AssociationSettingsPage] 가입 요청 목록 조회 실패:", error);
      }
    };
    void run();
  }, [associationId, canAdmin]);

  if (!associationId) return <Navigate to="/" replace />;
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">로딩 중...</div>;
  if (!association || association.deleted) return <Navigate to="/" replace />;
  if (!canAdmin) return <Navigate to={`/association/${associationId}`} replace />;

  const persist = async (payload: Record<string, unknown>) => {
    await updateDoc(doc(db, "associations", associationId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  };

  const handleSaveBasic = async () => {
    setSaving(true);
    try {
      await persist({
        name: name.trim(),
        sport: sport.trim(),
        region: region.trim(),
        description: description.trim(),
      });
      alert("기본 정보가 저장되었습니다.");
    } catch (error) {
      console.error("[AssociationSettingsPage] 기본정보 저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (uid: string, role: AssociationRole) => {
    if (!canOwner) return;
    const updated = members.map((m) => (m.uid === uid ? { ...m, role } : m));
    setMembers(updated);
    try {
      await persist({ members: updated });
    } catch (error) {
      console.error("[AssociationSettingsPage] 권한 변경 실패:", error);
      alert("권한 변경에 실패했습니다.");
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!canOwner) return;
    if (uid === user?.uid) {
      alert("본인은 제거할 수 없습니다.");
      return;
    }
    const updated = members.filter((m) => m.uid !== uid);
    setMembers(updated);
    try {
      await persist({ members: updated });
    } catch (error) {
      console.error("[AssociationSettingsPage] 멤버 제거 실패:", error);
      alert("멤버 제거에 실패했습니다.");
    }
  };

  const handleAddMember = async () => {
    if (!canOwner) return;
    const uid = newMemberUid.trim();
    if (!uid) return;
    if (members.some((m) => m.uid === uid)) {
      alert("이미 등록된 멤버입니다.");
      return;
    }

    const updated = [...members, { uid, role: "member" as const }];
    setMembers(updated);
    setNewMemberUid("");
    try {
      await persist({ members: updated });
    } catch (error) {
      console.error("[AssociationSettingsPage] 멤버 추가 실패:", error);
      alert("멤버 추가에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!canOwner || deleting) return;
    const ok = window.confirm("정말 이 협회를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.");
    if (!ok) return;

    setDeleting(true);
    try {
      await softDeleteAssociation(associationId);
      navigate("/sports", { replace: true });
    } catch (error) {
      console.error("[AssociationSettingsPage] 협회 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!associationId || !user?.uid || !canAdmin) return;
    try {
      const created = await createAssociationInvite({
        associationId,
        createdBy: user.uid,
        role: inviteRole,
      });
      setInviteLink(created.url);
      setInvites((prev) => [
        {
          id: created.inviteId,
          token: created.token,
          associationId,
          role: inviteRole,
          createdBy: user.uid,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          used: false,
          kind: "association",
        },
        ...prev,
      ]);
      await navigator.clipboard.writeText(created.url);
      alert("초대 링크가 생성되어 복사되었습니다.");
    } catch (error) {
      console.error("[AssociationSettingsPage] 초대 링크 생성 실패:", error);
      alert("초대 링크 생성에 실패했습니다.");
    }
  };

  const getInviteStatus = (invite: AssociationInviteDoc): "active" | "expired" | "used" => {
    if (invite.used) return "used";
    if (Date.now() > Number(invite.expiresAt || 0)) return "expired";
    return "active";
  };

  const filteredInvites = invites.filter((invite) => {
    if (inviteFilter === "all") return true;
    return getInviteStatus(invite) === inviteFilter;
  });

  const statusClass = (status: "active" | "expired" | "used") => {
    if (status === "active") return "bg-green-100 text-green-700";
    if (status === "used") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  const handleCopyInvite = async (invite: AssociationInviteDoc) => {
    try {
      const url = buildExternalUrl(`/invite/association/${invite.token}`);
      await navigator.clipboard.writeText(url);
      alert("초대 링크를 복사했습니다.");
    } catch (error) {
      console.error("[AssociationSettingsPage] 초대 링크 복사 실패:", error);
      alert("복사에 실패했습니다.");
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!canAdmin) return;
    try {
      await removeAssociationInvite(inviteId);
      setInvites((prev) => prev.filter((v) => v.id !== inviteId));
    } catch (error) {
      console.error("[AssociationSettingsPage] 초대 링크 삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const handleApproveJoinRequest = async (request: JoinRequestDoc) => {
    if (!canAdmin) return;
    const exists = members.some((m) => m.uid === request.uid);
    const nextMembers = exists ? members : [...members, { uid: request.uid, role: "member" as const }];
    try {
      if (!exists) {
        await persist({ members: nextMembers });
        setMembers(nextMembers);
      }
      await updateJoinRequestStatus(request.id, "approved");
      await createAssociationNotification({
        userId: request.uid,
        type: "ASSOCIATION_JOINED",
        title: "협회 가입 승인",
        body: `${association?.name || "협회"} 가입이 승인되었습니다.`,
        associationId,
      });
      setJoinRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (error) {
      console.error("[AssociationSettingsPage] 가입 요청 승인 실패:", error);
      alert("승인 처리에 실패했습니다.");
    }
  };

  const handleRejectJoinRequest = async (request: JoinRequestDoc) => {
    if (!canAdmin) return;
    try {
      await updateJoinRequestStatus(request.id, "rejected");
      setJoinRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (error) {
      console.error("[AssociationSettingsPage] 가입 요청 거절 실패:", error);
      alert("거절 처리에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button
              type="button"
              className="text-sm text-gray-500 mb-1"
              onClick={() => navigate(`/association/${associationId}`)}
            >
              ← 뒤로가기
            </button>
            <h1 className="text-2xl font-bold">협회 운영 센터</h1>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{association.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          <aside className="rounded-xl border bg-white p-2 h-fit">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${tab === item.key ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}
              >
                {item.label}
              </button>
            ))}
          </aside>

          <section className="rounded-xl border bg-white p-4">
            {tab === "basic" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">기본 정보</h2>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="협회명" />
                <Input value={sport} onChange={(e) => setSport(e.target.value)} placeholder="종목" />
                <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="지역" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 min-h-28"
                  placeholder="소개"
                />
                <div className="flex justify-end">
                  <Button onClick={handleSaveBasic} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
                </div>
              </div>
            )}

            {tab === "members" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">멤버 관리</h2>
                <div className="rounded-md border bg-gray-50 p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-800">초대 링크 생성</p>
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded px-2 py-2 text-sm bg-white"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                      disabled={!canAdmin}
                    >
                      <option value="member">member 초대</option>
                      <option value="admin">admin 초대</option>
                    </select>
                    <Button onClick={handleCreateInvite} disabled={!canAdmin}>초대 링크 생성</Button>
                  </div>
                  {inviteLink && (
                    <Input
                      value={inviteLink}
                      readOnly
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMemberUid}
                    onChange={(e) => setNewMemberUid(e.target.value)}
                    placeholder="UID 입력"
                    disabled={!canOwner}
                  />
                  <Button onClick={handleAddMember} disabled={!canOwner}>추가</Button>
                </div>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.uid} className="flex items-center justify-between border rounded-md px-3 py-2">
                      <div className="text-sm break-all">{m.uid}</div>
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.uid, e.target.value as AssociationRole)}
                          disabled={!canOwner || m.uid === user?.uid}
                        >
                          <option value="owner">owner</option>
                          <option value="admin">admin</option>
                          <option value="member">member</option>
                        </select>
                        <Button variant="outline" onClick={() => handleRemoveMember(m.uid)} disabled={!canOwner}>제거</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "invites" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">초대 링크 관리</h2>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-2 text-sm bg-white"
                    value={inviteFilter}
                    onChange={(e) => setInviteFilter(e.target.value as "all" | "active" | "expired" | "used")}
                  >
                    <option value="all">전체</option>
                    <option value="active">활성</option>
                    <option value="expired">만료</option>
                    <option value="used">사용됨</option>
                  </select>
                </div>

                {filteredInvites.length === 0 ? (
                  <div className="text-sm text-gray-500 border rounded-md p-4">생성된 초대 링크가 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {filteredInvites
                      .slice()
                      .sort((a, b) => Number(b.expiresAt || 0) - Number(a.expiresAt || 0))
                      .map((invite) => {
                        const status = getInviteStatus(invite);
                        return (
                          <div key={invite.id} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium">{invite.role} 초대</div>
                              <span className={`text-xs px-2 py-1 rounded ${statusClass(status)}`}>{status}</span>
                            </div>
                            <div className="text-xs text-gray-600 break-all">
                              {buildExternalUrl(`/invite/association/${invite.token}`)}
                            </div>
                            <div className="text-xs text-gray-500">
                              만료: {new Date(Number(invite.expiresAt || 0)).toLocaleString("ko-KR")}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" onClick={() => handleCopyInvite(invite)}>복사</Button>
                              <Button variant="outline" onClick={() => handleDeleteInvite(invite.id)}>삭제</Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {tab === "joinRequests" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">가입 요청 관리</h2>
                {joinRequests.length === 0 ? (
                  <div className="text-sm text-gray-500 border rounded-md p-4">대기 중인 가입 요청이 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {joinRequests.map((request) => (
                      <div key={request.id} className="border rounded-md p-3">
                        <div className="text-sm font-medium break-all">{request.uid}</div>
                        <div className="text-xs text-gray-500 mt-1">status: {request.status}</div>
                        <div className="flex gap-2 mt-3">
                          <Button onClick={() => handleApproveJoinRequest(request)}>승인</Button>
                          <Button variant="outline" onClick={() => handleRejectJoinRequest(request)}>거절</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "roles" && (
              <div className="space-y-2 text-sm text-gray-700">
                <h2 className="text-lg font-semibold text-gray-900">권한 정책</h2>
                <p><strong>OWNER</strong>: 삭제, 권한 변경, 수정 가능</p>
                <p><strong>ADMIN</strong>: 수정, 관리 페이지 접근 가능</p>
                <p><strong>MEMBER</strong>: 조회 전용</p>
              </div>
            )}

            {tab === "danger" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-red-600">위험 작업</h2>
                <p className="text-sm text-gray-600">협회를 soft delete 처리합니다. 복구는 별도 관리자 작업이 필요합니다.</p>
                <Button
                  onClick={handleDelete}
                  disabled={!canOwner || deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? "삭제 중..." : "협회 삭제"}
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
