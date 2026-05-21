/**
 * 🔥 탈퇴 버튼 컴포넌트
 * 
 * 역할:
 * - 유저 탈퇴 처리
 * - 확인 다이얼로그
 * - 재인증 필요 시 처리
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { withdrawUser } from "@/lib/withdrawUser";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function WithdrawButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleWithdraw = async () => {
    if (!confirm("정말 탈퇴하시겠어요?\n탈퇴 후 모든 데이터가 삭제되며 복구할 수 없습니다.")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await withdrawUser();
      
      // 🔥 탈퇴 성공 → 로그인 페이지로 이동
      alert("탈퇴가 완료되었습니다.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      console.error("❌ [WithdrawButton] 탈퇴 실패:", err);
      
      // 🔥 최근 로그인이 필요한 경우
      if (err.message?.includes("최근 로그인")) {
        setError("보안을 위해 다시 로그인해주세요.");
        // 재인증 필요 시 로그인 페이지로 이동
        navigate("/login", { replace: true });
      } else {
        setError(err.message || "탈퇴 처리 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        disabled={loading}
        onClick={handleWithdraw}
      >
        {loading ? "처리 중..." : "탈퇴하기"}
      </Button>
      {error && (
        <div className="p-2 bg-red-50 text-red-600 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
