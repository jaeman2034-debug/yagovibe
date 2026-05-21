// src/pages/api/reports/[artifactId]/download.tsx
// 🔥 리포트 다운로드 프록시 엔드포인트
//
// 🎯 핵심 원칙:
// - 권한 체크 후 Presigned URL 생성 또는 스트리밍
// - 보안 강화 (링크 공유 리스크 완화)

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MonthlyReportArtifact } from "@/domain/report/types";
import { generatePresignedURL } from "@/utils/storageService";

/**
 * 리포트 다운로드 페이지
 * 
 * 🔥 동작:
 * 1. 권한 체크 (팀 멤버인지 확인)
 * 2. Artifact 조회
 * 3. Presigned URL 생성 또는 스트리밍
 * 4. 다운로드 시작
 */
export default function ReportDownloadPage() {
  const router = useRouter();
  const { artifactId } = router.query;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artifactId || !user) return;

    const downloadReport = async () => {
      try {
        // Artifact 조회
        const artifactRef = doc(db, "monthlyReports", artifactId as string);
        const artifactSnap = await getDoc(artifactRef);

        if (!artifactSnap.exists()) {
          setError("리포트를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        const artifact = artifactSnap.data() as MonthlyReportArtifact;

        // 권한 체크 (팀 멤버인지 확인)
        const hasPermission = await checkTeamPermission(user.uid, artifact.teamId);
        if (!hasPermission) {
          setError("리포트를 다운로드할 권한이 없습니다.");
          setLoading(false);
          return;
        }

        // Presigned URL 생성
        const downloadUrl = await generatePresignedURL(artifact.storageKey, 3600); // 1시간 유효

        // 다운로드 시작
        window.location.href = downloadUrl;
      } catch (err: any) {
        console.error("[ReportDownload] 다운로드 실패:", err);
        setError(err.message || "다운로드 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    downloadReport();
  }, [artifactId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">리포트를 다운로드하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * 팀 권한 체크
 */
async function checkTeamPermission(userId: string, teamId: string): Promise<boolean> {
  try {
    const memberRef = doc(db, "teams", teamId, "members", userId);
    const memberSnap = await getDoc(memberRef);
    return memberSnap.exists();
  } catch {
    return false;
  }
}

