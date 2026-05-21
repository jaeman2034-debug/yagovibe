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
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import { useAuth } from "@/context/AuthProvider";
import { canEditTeam, canDeleteTeam } from "@/lib/team/permissions";
import { uploadTeamImage } from "@/lib/team/uploadTeamImage";
import { deleteTeam } from "@/lib/team/deleteTeam";
import { X, Upload, Trash2, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

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
      } catch (error) {
        console.error("❌ [TeamSettingsModal] 팀 데이터 로드 실패:", error);
        toast.error("팀 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [isOpen, teamId, user?.uid, onClose]);

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
