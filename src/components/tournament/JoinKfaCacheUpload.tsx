/**
 * 🔥 JoinKFA 캐시 업로드 컴포넌트 (사무국 전용)
 * 
 * 사무국이 JoinKFA에서 다운로드한 엑셀을 업로드하면
 * 시스템이 자동으로 선수 명단과 매칭
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { parseJoinKfaExcel, saveJoinKfaCache, getJoinKfaCache, type JoinKfaCache } from "@/lib/tournament/joinKfaCache";
import { Upload, CheckCircle2, XCircle } from "lucide-react";

interface JoinKfaCacheUploadProps {
  associationId: string;
  tournamentId: string;
  onUploadSuccess?: () => void;
}

export function JoinKfaCacheUpload({
  associationId,
  tournamentId,
  onUploadSuccess,
}: JoinKfaCacheUploadProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cache, setCache] = useState<JoinKfaCache | null>(null);

  // 캐시 조회
  const loadCache = async () => {
    setLoading(true);
    try {
      const data = await getJoinKfaCache(associationId, tournamentId);
      setCache(data);
    } catch (error: any) {
      console.error("캐시 조회 실패:", error);
      toast.error(`조회 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadCache();
  }, [associationId, tournamentId]);

  // 엑셀 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setUploading(true);
    try {
      const players = await parseJoinKfaExcel(file);
      
      if (players.length === 0) {
        toast.error("엑셀에서 선수 데이터를 찾을 수 없습니다.");
        return;
      }

      await saveJoinKfaCache({
        associationId,
        tournamentId,
        players,
        uploadedBy: user.uid,
        fileName: file.name,
      });

      toast.success(`JoinKFA 캐시 저장 완료: ${players.length}명`);
      await loadCache();
      onUploadSuccess?.();
    } catch (error: any) {
      console.error("업로드 실패:", error);
      toast.error(`업로드 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>JoinKFA 캐시 관리</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          JoinKFA에서 다운로드한 선수 명단 엑셀을 업로드하면, 시스템이 자동으로 선수 명단과 매칭하여 verified/mismatch를 표시합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="joinKfaFile"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("joinKfaFile")?.click()}
              disabled={uploading}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "업로드 중..." : "JoinKFA 엑셀 업로드"}
            </Button>
          </label>
          <Button
            variant="outline"
            onClick={loadCache}
            disabled={loading}
          >
            {loading ? "조회 중..." : "캐시 새로고침"}
          </Button>
        </div>

        {cache && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium">캐시 로드됨</span>
              </div>
              <Badge>{cache.totalCount}명</Badge>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>파일명: {cache.fileName}</p>
              <p>업로드일: {cache.uploadedAt?.toDate?.().toLocaleString("ko-KR") || "-"}</p>
              <p>검증된 선수: {cache.verifiedCount}명</p>
            </div>
          </div>
        )}

        {!cache && !loading && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              JoinKFA 캐시가 없습니다. 엑셀을 업로드해주세요.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

