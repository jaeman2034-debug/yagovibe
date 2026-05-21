/**
 * 🔥 테스트 데이터 관리 버튼
 * 
 * 공식 승격 후 보관 중인 테스트 데이터를 관리
 * - 테스트 데이터 상태 표시
 * - 테스트 데이터 삭제 (관리자 전용, 2단계 보호)
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, Trash2, Archive, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { getTestGroups, getTestMatches } from "@/lib/tournament/testModeUtils";
import { collection, doc, deleteDoc, getDocs, addDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TestDataManagementButtonProps {
  associationId: string;
  tournamentId: string;
  onSuccess?: () => void;
}

export function TestDataManagementButton({
  associationId,
  tournamentId,
  onSuccess,
}: TestDataManagementButtonProps) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasTestData, setHasTestData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 테스트 데이터 존재 여부 확인
  useEffect(() => {
    const checkTestData = async () => {
      setChecking(true);
      try {
        const testGroups = await getTestGroups(associationId, tournamentId);
        const testMatches = await getTestMatches(associationId, tournamentId);
        setHasTestData(!!testGroups || testMatches.length > 0);
      } catch (error) {
        console.error("테스트 데이터 확인 오류:", error);
        setHasTestData(false);
      } finally {
        setChecking(false);
      }
    };

    checkTestData();
  }, [associationId, tournamentId]);

  // 테스트 데이터 삭제
  const handleDelete = async () => {
    if (!user || !confirmedCheckbox || deleting) return;

    setDeleting(true);
    try {
      const batch = writeBatch(db);

      // 1. test_groups 삭제
      const testGroupsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/test_groups`
      );
      const testGroupsSnap = await getDocs(testGroupsRef);
      testGroupsSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. test_matches 삭제
      const testMatchesRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/test_matches`
      );
      const testMatchesSnap = await getDocs(testMatchesRef);
      testMatchesSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. test_drawLogs 삭제
      const testDrawLogsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/test_drawLogs`
      );
      const testDrawLogsSnap = await getDocs(testDrawLogsRef);
      testDrawLogsSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. 일괄 실행
      await batch.commit();

      // 5. 감사 로그 기록
      const auditLogsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/auditLogs`
      );
      await addDoc(auditLogsRef, {
        type: "DELETE_TEST_DATA",
        tournamentId,
        actor: user.uid,
        actorName: user.email || "관리자",
        timestamp: serverTimestamp(),
        details: "테스트 조추첨 및 대진표 데이터 삭제",
        metadata: {
          deletedCollections: ["test_groups", "test_matches", "test_drawLogs"],
        },
      });

      // 6. 운영 로그 기록
      const opsLogsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/opsLogs`
      );
      await addDoc(opsLogsRef, {
        action: "테스트 데이터 삭제",
        executor: user.uid,
        executorName: user.email || "관리자",
        timestamp: serverTimestamp(),
        details: "테스트 조추첨 및 대진표 데이터 삭제 (공식 데이터는 영향 없음)",
      });

      toast.success("✅ 테스트 데이터 삭제 완료");

      setShowDeleteConfirm(false);
      setConfirmedCheckbox(false);
      setHasTestData(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("테스트 데이터 삭제 실패:", error);
      toast.error(`❌ 테스트 데이터 삭제 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setDeleting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>테스트 데이터 확인 중...</span>
      </div>
    );
  }

  if (!hasTestData) {
    return null; // 테스트 데이터가 없으면 표시하지 않음
  }

  return (
    <>
      {/* 테스트 데이터 상태 표시 */}
      <Alert className="mb-4 border-blue-200 bg-blue-50">
        <Archive className="w-4 h-4 text-blue-600" />
        <AlertTitle className="text-blue-900">테스트 데이터 관리</AlertTitle>
        <AlertDescription className="text-sm mt-2 text-blue-800">
          <p className="mb-2">
            테스트 조추첨/대진표 데이터가 보관 중입니다.
          </p>
          <p className="text-xs text-blue-700">
            공식 운영 데이터에는 영향이 없으며, 필요 시 삭제할 수 있습니다.
          </p>
        </AlertDescription>
      </Alert>

      {/* 삭제 버튼 */}
      <div className="border rounded-lg p-4 bg-white">
        <Button
          onClick={() => setShowDeleteConfirm(true)}
          variant="outline"
          className="w-full border-red-300 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          테스트 데이터 삭제
        </Button>
      </div>

      {/* 1차 모달 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              ⚠️ 테스트 데이터 삭제
            </DialogTitle>
            <DialogDescription className="text-gray-700 mt-2">
              <p className="mb-4">
                다음 데이터가 삭제됩니다:
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Trash2 className="w-4 h-4 text-red-600 mt-0.5" />
                  <span>테스트 조추첨 데이터 (test_groups)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Trash2 className="w-4 h-4 text-red-600 mt-0.5" />
                  <span>테스트 대진표 데이터 (test_matches)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Trash2 className="w-4 h-4 text-red-600 mt-0.5" />
                  <span>테스트 추첨 로그 (test_drawLogs)</span>
                </div>
              </div>
              <Alert className="mt-4 bg-green-50 border-green-200">
                <AlertCircle className="w-4 h-4 text-green-600" />
                <AlertTitle className="text-green-900 text-sm">공식 데이터 안전</AlertTitle>
                <AlertDescription className="text-green-800 text-xs mt-1">
                  공식 운영 데이터(groups, matches)에는 영향이 없습니다.
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>

          {/* 2차 확인 체크박스 */}
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="confirm-delete-test-data"
              checked={confirmedCheckbox}
              onCheckedChange={(checked) => setConfirmedCheckbox(checked as boolean)}
            />
            <Label
              htmlFor="confirm-delete-test-data"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              테스트 데이터 삭제에 따른 책임을 인지했습니다.
            </Label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setConfirmedCheckbox(false);
              }}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              onClick={handleDelete}
              disabled={!confirmedCheckbox || deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

