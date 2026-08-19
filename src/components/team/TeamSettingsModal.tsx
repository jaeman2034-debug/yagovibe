/**
 * 🔥 TeamSettingsModal - 팀 설정 모달
 * 
 * 기능:
 * - 팀 소개 수정
 * - 팀 이미지 업로드
 * - 팀 공개 여부 변경
 * - 팀 삭제
 */

import { useState, useEffect, useRef } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import {
  parseTeamContacts,
  setTeamContacts,
  TEAM_CONTACT_ROLES,
  TEAM_CONTACT_ROLE_LABEL,
  type TeamContactPerson,
  type TeamContactRole,
  type TeamContacts,
} from "@/lib/team/teamContacts";
import { useAuth } from "@/context/AuthProvider";
import { canEditTeam, canDeleteTeam } from "@/lib/team/permissions";
import { uploadTeamImage } from "@/lib/team/uploadTeamImage";
import { deleteTeam } from "@/lib/team/deleteTeam";
import { X, Trash2, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

type MemberOption = { uid: string; label: string; phone?: string };

const EMPTY_PERSON = (): TeamContactPerson => ({
  name: "",
  phone: "",
  uid: "",
  fcmToken: null,
});

interface TeamSettingsModalProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TeamSettingsModal({
  teamId,
  isOpen,
  onClose,
  onSuccess,
}: TeamSettingsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  // 폼 상태
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [savingContacts, setSavingContacts] = useState(false);
  const [contacts, setContacts] = useState<TeamContacts>({
    chairman: EMPTY_PERSON(),
    manager: EMPTY_PERSON(),
    coach: EMPTY_PERSON(),
  });

  // 이미지 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 팀 데이터 로드
  useEffect(() => {
    if (!isOpen || !teamId || !user?.uid) return;

    const loadTeam = async () => {
      setLoading(true);
      try {
        // 권한 체크
        const [editPermission, deletePermission] = await Promise.all([
          canEditTeam(user.uid, teamId),
          canDeleteTeam(user.uid, teamId),
        ]);

        setCanEdit(editPermission);
        setCanDelete(deletePermission);

        if (!editPermission) {
          toast.error("팀 수정 권한이 없습니다.");
          onClose();
          return;
        }

        // 팀 데이터 조회
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          toast.error("팀을 찾을 수 없습니다.");
          onClose();
          return;
        }

        const teamData = teamSnap.data();
        setName(teamData.name || "");
        setDescription(teamData.description || "");
        setRegion(teamData.region || "");
        setImageUrl(teamData.imageUrl || "");
        setVisibility(teamData.visibility || "public");

        const parsed = parseTeamContacts(teamData.contacts);
        setContacts({
          chairman: parsed.chairman || EMPTY_PERSON(),
          manager: parsed.manager || EMPTY_PERSON(),
          coach: parsed.coach || EMPTY_PERSON(),
        });

        const memSnap = await getDocs(collection(db, "teams", teamId, "members"));
        const opts: MemberOption[] = [];
        memSnap.forEach((m) => {
          const d = m.data() as Record<string, unknown>;
          const status = String(d.status ?? "active").toLowerCase();
          if (status !== "active") return;
          const label =
            (typeof d.displayName === "string" && d.displayName.trim()) ||
            (typeof d.name === "string" && d.name.trim()) ||
            m.id;
          opts.push({
            uid: m.id,
            label,
            phone: typeof d.phone === "string" ? d.phone : undefined,
          });
        });
        opts.sort((a, b) => a.label.localeCompare(b.label, "ko"));
        setMembers(opts);
      } catch (error) {
        console.error("❌ [TeamSettingsModal] 팀 데이터 로드 실패:", error);
        toast.error("팀 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [isOpen, teamId, user?.uid, onClose]);

  const patchContact = (
    role: TeamContactRole,
    patch: Partial<TeamContactPerson>
  ) => {
    setContacts((prev) => ({
      ...prev,
      [role]: { ...(prev[role] || EMPTY_PERSON()), ...patch },
    }));
  };

  const handleSaveTeamContacts = async () => {
    setSavingContacts(true);
    try {
      const res = await setTeamContacts({
        teamId,
        contacts: {
          chairman: contacts.chairman,
          manager: contacts.manager,
          coach: contacts.coach,
        },
      });
      setContacts({
        chairman: res.contacts.chairman || EMPTY_PERSON(),
        manager: res.contacts.manager || EMPTY_PERSON(),
        coach: res.contacts.coach || EMPTY_PERSON(),
      });
      toast.success("회장·총무·감독 연락처가 저장되었습니다.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "연락처 저장에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSavingContacts(false);
    }
  };

  // 저장
  const handleSave = async () => {
    if (!user?.uid || !canEdit) return;

    setSaving(true);
    try {
      await updateTeamDocument(teamId, {
        name: name.trim(),
        description: description.trim() || null,
        region: region.trim() || null,
        imageUrl: imageUrl.trim() || null,
        visibility,
      });

      toast.success("팀 정보가 수정되었습니다.");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("❌ [TeamSettingsModal] 저장 실패:", error);
      toast.error("팀 정보 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!user?.uid || !canDelete) return;

    const confirmed = window.confirm(
      "정말 팀을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.\n\n삭제되는 데이터:\n- 팀 문서\n- 모든 팀원 정보\n- 팀 관련 활동\n- 초대 링크"
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      // 🔥 완전한 팀 삭제 (모든 관련 데이터 포함)
      await deleteTeam(teamId, user.uid);

      toast.success("팀이 완전히 삭제되었습니다.");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("❌ [TeamSettingsModal] 삭제 실패:", error);
      toast.error(error.message || "팀 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  // 이미지 파일 선택
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 체크
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다.");
      return;
    }

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    // 이미지 업로드
    handleImageUpload(file);
  };

  // 이미지 업로드 실행
  const handleImageUpload = async (file: File) => {
    if (!teamId) return;
    
    // 🔥 로그인 상태 확인
    if (!user?.uid) {
      console.error("❌ [TeamSettingsModal] 로그인 상태 확인 실패:", { user });
      toast.error("로그인이 필요합니다.");
      return;
    }
    
    console.log("🔍 [TeamSettingsModal] 이미지 업로드 시작:", {
      teamId,
      fileName: file.name,
      fileSize: file.size,
      userId: user.uid,
    });

    setUploading(true);
    try {
      const result = await uploadTeamImage(file, teamId);
      
      console.log("✅ [TeamSettingsModal] 이미지 업로드 성공:", {
        url: result.url,
        path: result.path,
      });
      
      setImageUrl(result.url);
      
      // 🔥 업로드 성공 후 즉시 Firestore에 저장 (사용자가 "저장" 버튼 누를 필요 없음)
      await updateTeamDocument(teamId, {
        imageUrl: result.url,
      });
      
      console.log("✅ [TeamSettingsModal] Firestore에 imageUrl 저장 완료");
      
      toast.success("이미지가 업로드되었습니다.");
      onSuccess?.(); // 부모 컴포넌트에 변경사항 알림
    } catch (error: any) {
      console.error("=".repeat(80));
      console.error("❌ [TeamSettingsModal] 이미지 업로드 실패");
      console.error("=".repeat(80));
      console.error("에러 코드:", error?.code);
      console.error("에러 메시지:", error?.message);
      console.error("전체 에러:", error);
      console.error("=".repeat(80));
      
      // 🔥 403 에러인 경우 Storage Rules 확인 안내
      if (error?.code === "storage/unauthorized" || error?.message?.includes("403")) {
        toast.error("이미지 업로드 권한이 없습니다. Firebase Storage Rules를 확인해주세요.");
      } else {
        toast.error(error.message || "이미지 업로드에 실패했습니다.");
      }
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 이미지 URL 직접 입력 (fallback)
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">팀 설정</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 팀 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                팀 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="팀 이름을 입력하세요"
              />
            </div>

            {/* 팀 지역 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                팀 지역
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 서울시 노원구"
              />
            </div>

            {/* 팀 소개 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                팀 소개
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="팀 소개를 입력하세요"
              />
            </div>

            {/* 팀 이미지 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                팀 이미지
              </label>
              
              {/* 파일 업로드 버튼 */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  <span>{uploading ? "업로드 중..." : "이미지 선택"}</span>
                </button>
              </div>

              {/* URL 직접 입력 (fallback) */}
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={handleImageUrlChange}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="또는 이미지 URL을 입력하세요"
                />
              </div>

              {/* 이미지 미리보기 */}
              {imageUrl && (
                <div className="mt-2">
                  <img
                    src={imageUrl}
                    alt="팀 이미지 미리보기"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                    onError={() => {
                      toast.error("이미지를 불러올 수 없습니다.");
                      setImageUrl("");
                    }}
                  />
                </div>
              )}
            </div>

            {/* PR4-1.2 — 회장·총무·감독 Contact Table (수신자 선택 UI 없음) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-900">
                  대관 연락처 (회장·총무·감독)
                </label>
                <p className="mt-1 text-xs text-gray-600">
                  협회 명부는 관리자 「연락처 일괄 등록」으로 가져오는 것을 권장합니다.
                  여기서는 수정만 하면 됩니다. 앱 푸시는 전화번호 가입 후 UID가 자동
                  연결되거나, 아래에서 앱 계정을 연결한 역할에만 갑니다.
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left text-xs text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">역할</th>
                      <th className="px-3 py-2 font-semibold">이름</th>
                      <th className="px-3 py-2 font-semibold">휴대폰</th>
                      <th className="px-3 py-2 font-semibold">앱 계정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TEAM_CONTACT_ROLES.map((role) => {
                      const row = contacts[role] || EMPTY_PERSON();
                      return (
                        <tr key={role} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                            {TEAM_CONTACT_ROLE_LABEL[role]}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.name}
                              onChange={(e) =>
                                patchContact(role, { name: e.target.value })
                              }
                              className="w-full min-w-[6rem] rounded border border-slate-200 px-2 py-1"
                              placeholder="이름"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="tel"
                              value={row.phone}
                              onChange={(e) =>
                                patchContact(role, { phone: e.target.value })
                              }
                              className="w-full min-w-[7rem] rounded border border-slate-200 px-2 py-1"
                              placeholder="010-"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.uid}
                              onChange={(e) => {
                                const m = members.find((x) => x.uid === e.target.value);
                                patchContact(role, {
                                  uid: e.target.value,
                                  name: row.name || m?.label || "",
                                  phone: row.phone || m?.phone || "",
                                });
                              }}
                              className="w-full min-w-[8rem] rounded border border-slate-200 px-2 py-1"
                            >
                              <option value="">미연결</option>
                              {members.map((m) => (
                                <option key={m.uid} value={m.uid}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                disabled={savingContacts}
                onClick={() => void handleSaveTeamContacts()}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingContacts ? "저장 중…" : "연락처 저장"}
              </button>
            </div>

            {/* 공개 여부 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                공개 여부
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="public"
                    checked={visibility === "public"}
                    onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">공개</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="private"
                    checked={visibility === "private"}
                    onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">비공개</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <button
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>팀 삭제</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>저장</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
