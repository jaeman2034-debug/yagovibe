/**
 * 🔥 대회 운영 요금제 Paywall 컴포넌트
 * 
 * 기능 사용 시도 시 요금제 안내 및 업그레이드 유도
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import { track } from "@/lib/analytics";
import type { TournamentPlanType } from "@/types/tournamentPlan";
import { TOURNAMENT_PLAN_PRICES, getTournamentPlanName } from "@/types/tournamentPlan";

interface TournamentPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: "excel_export" | "notification" | "payment" | "qr_checkin" | "custom_branding";
  currentPlan: TournamentPlanType;
  targetPlan: TournamentPlanType;
  associationId?: string;
}

export function TournamentPaywall({
  isOpen,
  onClose,
  trigger = "excel_export",
  currentPlan,
  targetPlan,
  associationId,
}: TournamentPaywallProps) {
  // Paywall 노출 추적
  useEffect(() => {
    if (isOpen) {
      track("tournament_paywall_impression", {
        trigger,
        currentPlan,
        targetPlan,
        associationId,
      });
    }
  }, [isOpen, trigger, currentPlan, targetPlan, associationId]);

  if (!isOpen) return null;

  const getTitle = () => {
    switch (trigger) {
      case "excel_export":
        return "엑셀 다운로드";
      case "notification":
        return "알림 자동화";
      case "payment":
        return "결제 연동";
      case "qr_checkin":
        return "현장 체크인";
      case "custom_branding":
        return "커스텀 브랜딩";
      default:
        return "프리미엄 기능";
    }
  };

  const getDescription = () => {
    switch (trigger) {
      case "excel_export":
        return "대회 운영에 필요한\n✔ 선수 명단 엑셀\n✔ 참가팀 요약 엑셀\n을 한 번에 받아보세요.";
      case "notification":
        return "미제출 팀에 자동으로 알림을 보내\n전화/문자 업무를 줄여보세요.";
      case "payment":
        return "입금 확인과 정산을 자동화해보세요.";
      case "qr_checkin":
        return "QR 코드로 현장 체크인을 자동화하세요.";
      case "custom_branding":
        return "플랫폼 로고를 제거하고 커스텀 브랜딩을 사용하세요.";
      default:
        return "대회 운영을 더욱 편리하게 만들어보세요.";
    }
  };

  const targetPlanPrice = TOURNAMENT_PLAN_PRICES[targetPlan];
  const planName = getTournamentPlanName(targetPlan);

  const handleUpgrade = () => {
    track("tournament_upgrade_click", {
      trigger,
      currentPlan,
      targetPlan,
      associationId,
    });
    
    // TODO: 결제 페이지로 이동
    // navigate(`/app/billing/upgrade?plan=${targetPlan}&associationId=${associationId}`);
    alert(`${planName} 플랜으로 업그레이드 (구현 예정)`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">💰 플랜 업그레이드</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">{getTitle()}</h3>
          <p className="text-gray-600 whitespace-pre-line">{getDescription()}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">{planName} 플랜</h4>
          {targetPlanPrice.monthly && (
            <p className="text-2xl font-bold text-blue-900 mb-1">
              월 {targetPlanPrice.monthly.toLocaleString()}원
            </p>
          )}
          {targetPlanPrice.perCompetition && (
            <p className="text-lg text-blue-700 mb-1">
              또는 대회당 {targetPlanPrice.perCompetition.toLocaleString()}원
            </p>
          )}
          <p className="text-sm text-blue-800">{targetPlanPrice.description}</p>
          
          <ul className="text-sm text-blue-800 space-y-1 mt-3">
            {targetPlan === "basic" && (
              <>
                <li>✅ 대회 무제한</li>
                <li>✅ 엑셀 Export</li>
                <li>✅ 알림 자동화</li>
                <li>✅ 커스텀 브랜딩</li>
              </>
            )}
            {targetPlan === "pro" && (
              <>
                <li>✅ BASIC 전부 포함</li>
                <li>✅ 결제 연동</li>
                <li>✅ 현장 체크인 (QR)</li>
                <li>✅ 우선 지원</li>
              </>
            )}
          </ul>
        </div>

        {/* 심리적 안전장치 */}
        <div className="mb-6 pt-4 border-t border-gray-200">
          <div className="flex flex-col gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>언제든지 플랜 변경이 가능합니다.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>대회 종료 후 자동 결제되지 않습니다.</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              track("tournament_upgrade_cancel", {
                trigger,
                currentPlan,
                targetPlan,
                associationId,
              });
              onClose();
            }}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            나중에
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            {targetPlan === "basic" ? "이 기능 사용하기" : "대회 운영 시작하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
