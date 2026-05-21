/**
 * 🔥 회계용 엑셀 다운로드 버튼 (관리자용)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

const FUNCTIONS_ORIGIN =
  import.meta.env.VITE_FUNCTIONS_ORIGIN ||
  "https://api-2q3hdcfwca-du.a.run.app";

interface AccountingExportButtonProps {
  associationId: string;
  tournamentId: string;
}

/**
 * 회계용 엑셀 다운로드 버튼 컴포넌트
 */
export function AccountingExportButton({
  associationId,
  tournamentId,
}: AccountingExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setDownloading(true);
    try {
      const idToken = await user.getIdToken();

      const res = await fetch(
        `${FUNCTIONS_ORIGIN}/exportAccountingXlsx?aid=${associationId}&tid=${tournamentId}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "엑셀 생성 실패");
      }

      // Signed URL로 다운로드
      window.open(data.url, "_blank");
      toast.success("회계 엑셀 파일이 생성되었습니다.");
    } catch (error: any) {
      console.error("엑셀 다운로드 오류:", error);
      toast.error(error.message || "엑셀 다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={downloading}
      variant="outline"
      size="sm"
    >
      {downloading ? (
        <>
          <FileSpreadsheet className="w-4 h-4 mr-2 animate-pulse" />
          생성 중...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          회계 엑셀 다운로드
        </>
      )}
    </Button>
  );
}

