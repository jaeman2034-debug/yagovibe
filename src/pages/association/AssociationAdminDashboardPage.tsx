import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { isAdmin, isOwner, type AssociationMember } from "@/utils/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { softDeleteAssociation } from "@/services/associationService";
import { updateJoinRequestStatus, type JoinRequestDoc } from "@/services/associationJoinRequestService";
import { createAssociationNotification } from "@/services/associationNotificationService";
import {
  deleteAssociationPost,
  toggleAssociationPostPinned,
  updateAssociationPostType,
  type AssociationPost,
  type AssociationPostType,
} from "@/services/associationPostService";

type TabKey = "overview" | "notices" | "members" | "joinRequests" | "posts" | "danger";

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
  { key: "overview", label: "대시보드" },
  { key: "notices", label: "공지 관리" },
  { key: "members", label: "멤버 관리" },
  { key: "joinRequests", label: "가입 요청" },
  { key: "posts", label: "게시글 관리" },
  { key: "danger", label: "위험 작업" },
];

export default function AssociationAdminDashboardPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [association, setAssociation] = useState<AssociationData | null>(null);
  const [members, setMembers] = useState<AssociationMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestDoc[]>([]);
  const [posts, setPosts] = useState<AssociationPost[]>([]);
  const [newMemberUid, setNewMemberUid] = useState("");
  const [deletingAssoc, setDeletingAssoc] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!associationId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "associations", associationId),
      (snap) => {
        if (!snap.exists()) {
          setAssociation(null);
          setLoading(false);
          return;
        }
        const data = snap.data() as Omit<AssociationData, "id">;
        const normalizedMembers = data.members && data.members.length > 0
          ? data.members
          : data.ownerUid || data.ownerId
            ? [{ uid: (data.ownerUid || data.ownerId) as string, role: "owner" as const }]
            : [];
        setAssociation({ id: snap.id, ...data, members: normalizedMembers });
        setMembers(normalizedMembers);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [associationId]);

  useEffect(() => {
    if (!associationId) return;
    const q = query(
      collection(db, "joinRequests"),
      where("associationId", "==", associationId),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      setJoinRequests(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<JoinRequestDoc, "id">),
        }))
      );
    });
    return () => unsub();
  }, [associationId]);

  useEffect(() => {
    if (!associationId) return;
    const q = query(
      collection(db, "posts"),
      where("associationId", "==", associationId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AssociationPost, "id">),
        }))
      );
    });
    return () => unsub();
  }, [associationId]);

  const canAdmin = useMemo(() => isAdmin(association, user?.uid), [association, user?.uid]);
  const canOwner = useMemo(() => isOwner(association, user?.uid), [association, user?.uid]);

  if (!associationId) return <Navigate to="/" replace />;
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">로딩 중...</div>;
  if (!association || association.deleted) return <Navigate to="/" replace />;
  if (!canAdmin) return <Navigate to={`/association/${associationId}`} replace />;

  const noticePosts = posts.filter((p) => p.type === "notice");
  const todayActivityCount = posts.filter((p) => {
    const created = p.createdAt?.toDate?.();
    if (!created) return false;
    const now = new Date();
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    );
  }).length;

  const persistMembers = async (nextMembers: AssociationMember[]) => {
    await updateDoc(doc(db, "associations", associationId), {
      members: nextMembers,
      updatedAt: serverTimestamp(),
    });
  };

  const handleRoleChange = async (uid: string, role: AssociationMember["role"]) => {
    if (!canOwner) return;
    const next = members.map((m) => (m.uid === uid ? { ...m, role } : m));
    setMembers(next);
    try {
      await persistMembers(next);
    } catch {
      alert("권한 변경에 실패했습니다.");
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!canOwner) return;
    if (uid === user?.uid) {
      alert("본인은 제거할 수 없습니다.");
      return;
    }
    const next = members.filter((m) => m.uid !== uid);
    setMembers(next);
    try {
      await persistMembers(next);
    } catch {
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
    const next = [...members, { uid, role: "member" as const }];
    setMembers(next);
    setNewMemberUid("");
    try {
      await persistMembers(next);
    } catch {
      alert("멤버 추가에 실패했습니다.");
    }
  };

  const handleApproveJoinRequest = async (request: JoinRequestDoc) => {
    const exists = members.some((m) => m.uid === request.uid);
    const next = exists ? members : [...members, { uid: request.uid, role: "member" as const }];
    setSaving(true);
    try {
      if (!exists) await persistMembers(next);
      await updateJoinRequestStatus(request.id, "approved");
      await createAssociationNotification({
        userId: request.uid,
        type: "ASSOCIATION_JOINED",
        title: "협회 가입 승인",
        body: `${association.name || "협회"} 가입이 승인되었습니다.`,
        associationId,
      });
    } catch {
      alert("승인 처리에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleRejectJoinRequest = async (request: JoinRequestDoc) => {
    setSaving(true);
    try {
      await updateJoinRequestStatus(request.id, "rejected");
    } catch {
      alert("거절 처리에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePinNotice = async (post: AssociationPost) => {
    try {
      await toggleAssociationPostPinned(post.id, !post.isPinned);
    } catch {
      alert("고정 변경 실패");
    }
  };

  const handleDeletePost = async (postId: string) => {
    const ok = window.confirm("이 게시글을 삭제하시겠습니까?");
    if (!ok) return;
    try {
      await deleteAssociationPost(postId);
    } catch {
      alert("게시글 삭제 실패");
    }
  };

  const handleConvertToNotice = async (post: AssociationPost) => {
    try {
      await updateAssociationPostType(post.id, "notice", { isPinned: false });
    } catch {
      alert("공지 전환 실패");
    }
  };

  const handleDeleteAssociation = async () => {
    if (!canOwner || deletingAssoc) return;
    const ok = window.confirm("정말 이 협회를 삭제하시겠습니까?\n삭제 후 복구는 관리자 작업이 필요합니다.");
    if (!ok) return;
    setDeletingAssoc(true);
    try {
      await softDeleteAssociation(associationId);
      navigate("/sports", { replace: true });
    } catch {
      alert("협회 삭제에 실패했습니다.");
    } finally {
      setDeletingAssoc(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button
              type="button"
              className="text-sm text-gray-500 mb-1"
              onClick={() => navigate(`/association/${associationId}`)}
            >
              ← 뒤로가기
            </button>
            <h1 className="text-2xl font-bold">협회 운영 대시보드</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{association.name}</span>
            <Button variant="outline" onClick={() => navigate(`/association/${associationId}/settings`)}>
              설정 페이지
            </Button>
          </div>
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
            {tab === "overview" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">요약</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border p-3 bg-gray-50"><p className="text-xs text-gray-500">총 멤버 수</p><p className="text-xl font-bold">{members.length}</p></div>
                  <div className="rounded-lg border p-3 bg-gray-50"><p className="text-xs text-gray-500">게시글 수</p><p className="text-xl font-bold">{posts.length}</p></div>
                  <div className="rounded-lg border p-3 bg-gray-50"><p className="text-xs text-gray-500">가입 요청 수</p><p className="text-xl font-bold">{joinRequests.length}</p></div>
                  <div className="rounded-lg border p-3 bg-gray-50"><p className="text-xs text-gray-500">오늘 활동 수</p><p className="text-xl font-bold">{todayActivityCount}</p></div>
                </div>
              </div>
            )}

            {tab === "notices" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">공지 관리</h2>
                  <Button onClick={() => navigate(`/association/${associationId}/posts/create?type=notice`)}>공지 작성</Button>
                </div>
                {noticePosts.length === 0 ? (
                  <div className="text-sm text-gray-500 border rounded-md p-4">공지글이 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {noticePosts.map((post) => (
                      <div key={post.id} className="border rounded-md p-3 bg-amber-50">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{post.title}</p>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => void handleTogglePinNotice(post)}>
                              {post.isPinned ? "고정 해제" : "상단 고정"}
                            </Button>
                            <Button variant="outline" onClick={() => void handleDeletePost(post.id)}>삭제</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "members" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">멤버 관리</h2>
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
                          onChange={(e) => void handleRoleChange(m.uid, e.target.value as AssociationMember["role"])}
                          disabled={!canOwner || m.uid === user?.uid}
                        >
                          <option value="owner">owner</option>
                          <option value="admin">admin</option>
                          <option value="member">member</option>
                        </select>
                        <Button variant="outline" onClick={() => void handleRemoveMember(m.uid)} disabled={!canOwner}>제거</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "joinRequests" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">가입 요청</h2>
                {joinRequests.length === 0 ? (
                  <div className="text-sm text-gray-500 border rounded-md p-4">대기 중인 요청이 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {joinRequests.map((req) => (
                      <div key={req.id} className="border rounded-md p-3">
                        <div className="text-sm font-medium break-all">{req.uid}</div>
                        <div className="text-xs text-gray-500 mt-1">{req.createdAt ? "요청 도착" : "요청"}</div>
                        <div className="flex gap-2 mt-3">
                          <Button onClick={() => void handleApproveJoinRequest(req)} disabled={saving}>승인</Button>
                          <Button variant="outline" onClick={() => void handleRejectJoinRequest(req)} disabled={saving}>거절</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "posts" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">게시글 관리</h2>
                {posts.length === 0 ? (
                  <div className="text-sm text-gray-500 border rounded-md p-4">게시글이 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {posts.map((post) => (
                      <div key={post.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{post.title}</p>
                            <p className="text-xs text-gray-500">{post.type} · {post.uid}</p>
                          </div>
                          <div className="flex gap-2">
                            {post.type !== "notice" && (
                              <Button variant="outline" onClick={() => void handleConvertToNotice(post)}>공지 전환</Button>
                            )}
                            <Button variant="outline" onClick={() => void handleDeletePost(post.id)}>삭제</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "danger" && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-red-600">위험 작업</h2>
                <p className="text-sm text-gray-600">협회 soft delete 처리 (복구는 별도 관리자 작업 필요)</p>
                <Button onClick={handleDeleteAssociation} disabled={!canOwner || deletingAssoc} className="bg-red-600 hover:bg-red-700 text-white">
                  {deletingAssoc ? "삭제 중..." : "협회 삭제"}
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

