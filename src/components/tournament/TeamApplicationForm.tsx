/**
 * 🔥 참가팀 신청 폼 컴포넌트 (단계별 UI)
 * 
 * 팀 사용자가 대회에 참가 신청하는 폼
 * Step 1: 팀 기본 정보 입력
 * Step 2: 선수 명단 입력 (복붙/엑셀)
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTournamentApplication } from "@/lib/tournament/applicationRepository";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { auth } from "@/lib/firebase";
import type { FeePolicy } from "@/components/notice/FeeSummaryBox";
import { RosterImportAndClassify } from "@/components/roster/RosterImportAndClassify";
import type { Tournament } from "@/types/tournament";
import { X } from "lucide-react";
import { FeeSummaryCard } from "./FeeSummaryCard";

interface TeamApplicationFormProps {
  associationId: string;
  tournamentId: string;
  tournamentName: string;
  tournament?: Tournament; // ageRule을 위해 추가
  feePolicy?: FeePolicy;
  onSuccess?: () => void;
  onClose?: () => void; // Drawer/Modal 닫기용
}

export function TeamApplicationForm({
  associationId,
  tournamentId,
  tournamentName,
  tournament,
  feePolicy,
  onSuccess,
  onClose,
}: TeamApplicationFormProps) {
  const { user: contextUser, loading: authLoading } = useAuth();
  
  // 🔥 Fallback: contextUser가 없을 때 auth.currentUser 직접 확인
  const user = contextUser || auth.currentUser;
  const [step, setStep] = useState<1 | 2>(1); // 단계 관리: 1=팀 정보, 2=비용 확인
  const [teamName, setTeamName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [teamCount, setTeamCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [memo, setMemo] = useState("");
  const [joinKfaTeamId, setJoinKfaTeamId] = useState(""); // JoinKFA 팀 ID (선택)
  const [joinKfaPassword, setJoinKfaPassword] = useState(""); // JoinKFA 비밀번호 (선택, 저장 안 함)
  const [applicationId, setApplicationId] = useState<string | null>(null); // Step 1 완료 후 저장
  const [agreedToTournamentTerms, setAgreedToTournamentTerms] = useState(false); // 대회 참가 약관 동의 (Step 2)
  const [agreedToPrivacyTerms, setAgreedToPrivacyTerms] = useState(false); // 개인정보 수집 동의 (Step 2)

  // Step 1: 팀 정보 입력 → Step 2로 이동
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 항목 검증
    if (!teamName.trim() || !managerName.trim() || !phone.trim()) {
      toast.error("모든 필수 항목을 입력해주세요.");
      return;
    }

    // Step 2로 이동
    setStep(2);
  };

  // Step 2: 최종 신청 제출
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ⭐⭐⭐ 핵심 1: 중복 호출 완전 차단 (동시성 충돌 방지)
    if (loading) {
      console.warn("[참가 신청] 이미 처리 중입니다. 중복 요청 무시", {
        timestamp: Date.now(),
      });
      return;
    }
    
    // ⭐⭐⭐ 핵심 2: 사용자 체크를 가장 먼저 (인증 로딩 전에)
    if (!user) {
      console.warn("[참가 신청] 사용자 없음 (즉시 차단)", {
        contextUser: !!contextUser,
        currentUser: !!auth.currentUser,
        authLoading,
        timestamp: Date.now(),
      });
      toast.error("로그인이 필요합니다. 페이지를 새로고침하거나 다시 로그인해주세요.");
      return;
    }
    
    // 🔥 인증 상태 확인 (로딩 중이면 대기)
    if (authLoading) {
      console.warn("[참가 신청] 인증 상태 확인 중...");
      toast.info("인증 상태를 확인하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    
    // 🔥 디버깅: 제출 시작 로그
    console.log("[참가 신청] 제출 시작", {
      contextUser: !!contextUser,
      currentUser: !!auth.currentUser,
      user: !!user,
      authLoading,
      agreedToTournamentTerms,
      agreedToPrivacyTerms,
      feePolicy: !!feePolicy,
      teamName,
      managerName,
      phone,
      teamCount,
      timestamp: Date.now(),
    });

    if (!agreedToTournamentTerms || !agreedToPrivacyTerms) {
      console.warn("[참가 신청] 약관 미동의", {
        agreedToTournamentTerms,
        agreedToPrivacyTerms,
      });
      toast.error("모든 약관에 동의해주세요.");
      return;
    }

    if (!feePolicy) {
      console.warn("[참가 신청] 참가비 정책 없음");
      toast.error("참가비 정보를 불러올 수 없습니다.");
      return;
    }

    setLoading(true);

    try {
      // TODO: teamId는 실제 팀 정보에서 가져와야 함
      // 현재는 임시로 user.uid 사용
      const teamId = user.uid; // 실제로는 teams 컬렉션에서 조회 필요

      const applicationId = await createTournamentApplication({
        associationId,
        tournamentId,
        teamId,
        teamName: teamName.trim(),
        managerName: managerName.trim(),
        phone: phone.trim(),
        teamCount,
        feePolicy,
        createdBy: user.uid, // 🔥 생성자 UID 추가 (Rules 읽기 권한용)
      });

      // applicationId 저장 (필요시 사용)
      setApplicationId(applicationId);
      
      // 🔥 신청 완료 토스트 (다음 단계 명시 - 사용자 제시 패턴 적용)
      toast.success(
        "✅ 참가 신청이 완료되었습니다.\n\n협회 승인 후,\n팀장이 선수 명단을 등록하게 됩니다.",
        { duration: 7000 }
      );
      
      // 신청 완료 처리
      onSuccess?.();
      onClose?.();
    } catch (error: any) {
      console.error("[참가 신청] 오류 발생:", error);
      
      // 🔥 에러 코드와 메시지를 명확히 로그에 기록 (디버깅용)
      console.error("[참가 신청] 에러 상세:", {
        code: error?.code,
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      
      // 🔥 사용자에게 명확한 에러 메시지 표시
      const errorMessage = error?.message || "알 수 없는 오류";
      const errorCode = error?.code || "unknown";
      
      // Firebase 에러인 경우 더 친화적인 메시지
      if (errorCode === "permission-denied" || errorCode === "missing-or-insufficient-permissions") {
        toast.error("권한이 없습니다. 로그인 상태를 확인해주세요.", { duration: 5000 });
      } else if (errorCode?.includes("invalid-argument") || error?.message?.includes("undefined")) {
        toast.error("입력 정보에 문제가 있습니다. 다시 시도해주세요.", { duration: 5000 });
      } else {
        toast.error(`신청 중 오류가 발생했습니다: ${errorMessage} (코드: ${errorCode})`, { duration: 5000 });
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: 선수 명단 저장 완료 후 전체 완료 (deprecated - 더 이상 사용 안 함)
  const handleRosterSaveSuccess = () => {
    toast.success(
      "신청이 접수되었습니다.\n승인 후 팀장 초대 링크로 선수 명단을 등록하세요.",
      { duration: 5000 }
    );
    onSuccess?.();
    onClose?.();
  };

  // 🔥 참가비 계산은 FeeSummaryCard에서 처리 (단일 소스 보장)
  // 참고: feePreview는 현재 사용하지 않음 (FeeSummaryCard가 표시)

  return (
    <Card className="relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>참가 신청</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`px-2 py-1 rounded ${step === 1 ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100'}`}>
              1
            </span>
            <span className="text-gray-400">/</span>
            <span className={`px-2 py-1 rounded ${step === 2 ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100'}`}>
              2
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {step === 1 
            ? "팀 기본 정보를 입력해주세요." 
            : "참가비를 확인하고 신청을 완료해주세요."}
        </p>
      </CardHeader>
      
      <CardContent>
        {step === 1 ? (
          <form onSubmit={handleStep1Next} className="space-y-4">
          {/* 🔥 팀 수 선택 (최상단 배치) */}
          <div className="space-y-3">
            <Label htmlFor="teamCount">신청 팀 수 *</Label>
            
            {/* 버튼형 빠른 선택 (1~4팀) */}
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setTeamCount(count)}
                  className={`px-4 py-2 rounded-md border text-sm font-medium transition-all ${
                    teamCount === count
                      ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  {count}팀
                </button>
              ))}
            </div>
            
            {/* 직접 입력 (5팀 이상) */}
            <div className="flex items-center gap-2">
              <Input
                id="teamCount"
                type="number"
                min="1"
                max="20"
                value={teamCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setTeamCount(Math.max(1, Math.min(20, value))); // 1~20 제한
                }}
                className="flex-1"
                required
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">팀</span>
            </div>

            {/* 참가비 정책 안내 (팀 수 선택 바로 아래) */}
            {feePolicy && teamCount > feePolicy.baseTeamCount && (
              <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                <p className="text-xs text-amber-800">
                  ℹ️ {feePolicy.baseTeamCount + 1}팀부터 팀당 {feePolicy.extraFeePerTeam.toLocaleString()}원이 추가됩니다.
                </p>
              </div>
            )}
          </div>

          {/* 🔥 참가비 실시간 요약 카드 (팀 수 선택 바로 아래 - 사용자 제시 패턴) */}
          {feePolicy && (
            <FeeSummaryCard
              teamCount={teamCount}
              feePolicy={feePolicy}
              className="mt-4"
            />
          )}

          {/* 🔥 필수 1: 참가 신청 영역 바로 아래 고정 안내 (사용자 제시 패턴) */}
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-lg font-bold">ℹ️</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 mb-1">
                  참가 신청이 승인되면, 팀장이 선수 명단을 등록할 수 있습니다.
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  (팀원 개별 신청은 없습니다)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamName">팀명 *</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="예: 노원FC"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerName">담당자 이름 *</Label>
            <Input
              id="managerName"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="예: 홍길동"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">연락처 *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
              required
            />
          </div>

          {/* JoinKFA 정보 (선택 사항) */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">JoinKFA 정보 (선택 사항)</p>
            <div className="space-y-2">
              <Label htmlFor="joinKfaTeamId">JoinKFA 팀 ID</Label>
              <Input
                id="joinKfaTeamId"
                value={joinKfaTeamId}
                onChange={(e) => setJoinKfaTeamId(e.target.value)}
                placeholder="예: TEAM12345"
              />
              <p className="text-xs text-muted-foreground">
                JoinKFA에서 발급받은 팀 ID를 입력하세요.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinKfaPassword">JoinKFA 비밀번호</Label>
              <Input
                id="joinKfaPassword"
                type="password"
                value={joinKfaPassword}
                onChange={(e) => setJoinKfaPassword(e.target.value)}
                placeholder="사무국 조회 시에만 사용 (저장되지 않음)"
              />
              <p className="text-xs text-muted-foreground">
                비밀번호는 저장되지 않으며, 사무국에서 "조회 요청" 시에만 사용됩니다.
              </p>
            </div>
          </div>

            {/* Step 1: 다음 단계 버튼 (하단 고정) */}
            <div className="space-y-2 pt-2">
              <Button type="submit" disabled={loading} className="w-full">
                다음 단계 →
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-full text-sm"
              >
                취소
              </Button>
            </div>
          </form>
        ) : (
          // Step 2: 비용 확인 & 최종 신청
          <form onSubmit={handleStep2Submit} className="space-y-4">
            {/* 입력 정보 요약 (읽기 전용) */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">입력 정보 확인</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">팀명</span>
                  <span className="font-medium text-gray-900">{teamName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">담당자</span>
                  <span className="font-medium text-gray-900">{managerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">연락처</span>
                  <span className="font-medium text-gray-900">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">신청 팀 수</span>
                  <span className="font-medium text-gray-900">{teamCount}팀</span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="w-full mt-2 text-xs"
              >
                ← 정보 수정
              </Button>
            </div>

            {/* 🔥 참가비 실시간 요약 카드 (Step 2 핵심) */}
            {feePolicy && (
              <FeeSummaryCard
                teamCount={teamCount}
                feePolicy={feePolicy}
                className="mb-4"
              />
            )}

            {/* 약관 동의 (2개 분리) */}
            <div className="space-y-3">
              {/* 대회 참가 약관 동의 */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTournamentTerms}
                    onChange={(e) => setAgreedToTournamentTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    required
                  />
                  <span className="text-sm text-gray-700">
                    <strong className="text-blue-700">☑ 대회 참가 약관 동의 (필수)</strong>
                    <br />
                    <span className="text-xs text-gray-600 mt-1 block">
                      본 대회의 참가 규정 및 운영 방침에 동의합니다.
                      <br />
                      <a 
                        href="/terms-of-service" 
                        target="_blank"
                        className="text-blue-600 underline hover:text-blue-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        이용약관 보기
                      </a>
                    </span>
                  </span>
                </label>
              </div>

              {/* 개인정보 수집 동의 */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToPrivacyTerms}
                    onChange={(e) => setAgreedToPrivacyTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    required
                  />
                  <span className="text-sm text-gray-700">
                    <strong className="text-blue-700">☑ 개인정보 수집·이용 동의 (필수)</strong>
                    <br />
                    <span className="text-xs text-gray-600 mt-1 block">
                      본 대회 참가를 위한 개인정보 수집 및 이용에 동의합니다.
                      <br />
                      <strong>수집 항목:</strong> 팀명, 담당자명, 연락처, 신청 팀 수, 선수 명단
                      <br />
                      <strong>보관 기간:</strong> 대회 종료 후 1년
                      <br />
                      <a 
                        href="/privacy-policy" 
                        target="_blank"
                        className="text-blue-600 underline hover:text-blue-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        개인정보 처리방침 보기
                      </a>
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* 결제 안내 문구 */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-800 text-center">
                ℹ️ 신청 후 담당자가 별도로 결제 안내를 드립니다.
              </p>
            </div>

            {/* 🔥 다음 단계 가이드 (참가 신청 버튼 바로 위 - 사용자 제시 패턴 A) */}
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-lg font-bold">ℹ️</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900 mb-2">
                    다음 단계 안내
                  </p>
                  <div className="text-xs text-blue-800 leading-relaxed space-y-1">
                    <p>
                      참가 신청이 완료되면,<br />
                      <strong className="text-blue-900">협회 승인 후 팀장이 선수 명단을 등록</strong>할 수 있습니다.
                    </p>
                    <p className="text-blue-700 mt-2">
                      ※ 팀원(선수)은 지금 개별 신청하지 않습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: 최종 신청 버튼 (하단 고정) */}
            <div className="space-y-2 pt-2">
              {/* 🔥 버튼 비활성 사유 명시 (약관 동의 미완료 시) */}
              {(!agreedToTournamentTerms || !agreedToPrivacyTerms) && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-2">
                  <p className="text-xs text-amber-800 text-center font-medium">
                    ⛔ 약관 동의가 완료되어야 참가 신청이 가능합니다.
                  </p>
                </div>
              )}

              <Button 
                type="submit"
                disabled={loading || !agreedToTournamentTerms || !agreedToPrivacyTerms} 
                onClick={(e) => {
                  // ⭐⭐⭐ 핵심: 중복 클릭 완전 차단
                  if (loading) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.warn("[참가 신청] 이미 처리 중입니다. 클릭 무시", {
                      timestamp: Date.now(),
                    });
                    toast.warning("이미 처리 중입니다. 잠시만 기다려주세요.");
                    return;
                  }
                  
                  // disabled 상태면 클릭 이벤트 차단
                  if (!agreedToTournamentTerms || !agreedToPrivacyTerms) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.warn("[참가 신청] 약관 미동의 상태");
                    return;
                  }
                  
                  // 🔥 디버깅: 버튼 클릭 이벤트 확인
                  console.log("[참가 신청] 버튼 클릭됨", {
                    loading,
                    agreedToTournamentTerms,
                    agreedToPrivacyTerms,
                    timestamp: Date.now(),
                  });
                  
                  // form의 onSubmit이 처리하도록 함 (중복 방지)
                }}
                className={`w-full ${
                  !agreedToTournamentTerms || !agreedToPrivacyTerms
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {loading 
                  ? "신청 중..." 
                  : !agreedToTournamentTerms || !agreedToPrivacyTerms
                  ? "약관 동의 후 신청 가능"
                  : "참가 신청 완료"
                }
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="w-full text-sm"
                disabled={loading}
              >
                ← 이전 단계
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

