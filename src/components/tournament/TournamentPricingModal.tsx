/**
 * 🔥 요금제 선택 모달 (실제 결제 UX)
 * 
 * 트리거 기반으로 노출되는 요금제 선택 화면
 * "지금 필요해서 결제"하는 느낌을 주는 카피
 */

import { useState } from "react";
import { X, Check, Star } from "lucide-react";
import { track } from "@/lib/analytics";
import type { TournamentPlanType } from "@/types/tournamentPlan";
import {
  TOURNAMENT_PLAN_PRICES,
  getTournamentPlanName,
  getTournamentPlanDescription,
} from "@/types/tournamentPlan";

interface TournamentPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: "excel_export" | "notification" | "payment" | "qr_checkin" | "custom_branding";
  currentPlan: TournamentPlanType;
  associationId?: string;
  onSelectPlan?: (plan: TournamentPlanType) => void;
}

export function TournamentPricingModal({
  isOpen,
  onClose,
  trigger = "excel_export",
  currentPlan,
  associationId,
  onSelectPlan,
}: TournamentPricingModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<TournamentPlanType | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

  const getTriggerMessage = () => {
    switch (trigger) {
      case "excel_export":
        return {
          title: "엑셀 다운로드",
          description: "대회 운영에 필요한 선수 명단과 참가팀 요약을 한 번에 받아보세요.",
        };
      case "notification":
        return {
          title: "알림 자동화",
          description: "미제출 팀에 자동으로 알림을 보내 전화/문자 업무를 줄여보세요.",
        };
      case "payment":
        return {
          title: "참가비 결제 연동",
          description: "입금 확인과 정산을 자동화해보세요.",
        };
      case "qr_checkin":
        return {
          title: "현장 체크인",
          description: "QR 코드로 현장 체크인을 자동화하세요.",
        };
      case "custom_branding":
        return {
          title: "커스텀 브랜딩",
          description: "플랫폼 로고를 제거하고 커스텀 브랜딩을 사용하세요.",
        };
      default:
        return {
          title: "프리미엄 기능",
          description: "대회 운영을 더욱 편리하게 만들어보세요.",
        };
    }
  };

  const triggerMsg = getTriggerMessage();

  const handleSelectPlan = (plan: TournamentPlanType) => {
    setSelectedPlan(plan);
    track("tournament_plan_selected", {
      trigger,
      currentPlan,
      selectedPlan: plan,
      associationId,
    });
    onSelectPlan?.(plan);
  };

  const handleUpgrade = () => {
    if (!selectedPlan) return;

    track("tournament_upgrade_click", {
      trigger,
      currentPlan,
      targetPlan: selectedPlan,
      associationId,
    });

    // TODO: 결제 페이지로 이동
    // navigate(`/app/billing/upgrade?plan=${selectedPlan}&associationId=${associationId}`);
    alert(`${getTournamentPlanName(selectedPlan)} 플랜으로 업그레이드 (구현 예정)`);
  };

  return (
    <>
      <PaymentConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmPayment}
        plan={selectedPlan || "basic"}
        associationId={associationId}
      />
      
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              대회 운영에 필요한 기능을 선택하세요
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 요금제 카드 */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* FREE */}
            <div
              className={`border-2 rounded-lg p-6 ${
                currentPlan === "free"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">🟢 FREE</h3>
                  <p className="text-xs text-gray-500 mt-1">시작하기</p>
                </div>
                {currentPlan === "free" && (
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                    현재 사용 중
                  </span>
                )}
              </div>
              
              {/* 포함 기능 */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">포함 기능</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>대회 1개</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>참가 신청 / 승인</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>선수 명단 관리</span>
                  </li>
                </ul>
              </div>

              {/* 제한 기능 */}
              <div className="mb-6 pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-2">제한 기능</p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>엑셀 다운로드</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>알림 자동화</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>결제 연동</span>
                  </li>
                </ul>
              </div>
              {currentPlan === "free" ? (
                <button
                  disabled
                  className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  현재 플랜
                </button>
              ) : (
                <button
                  onClick={() => handleSelectPlan("free")}
                  className={`w-full py-2 px-4 border-2 rounded-lg transition-colors ${
                    selectedPlan === "free"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  선택하기
                </button>
              )}
            </div>

            {/* BASIC ⭐ 추천 */}
            <div
              className={`border-2 rounded-lg p-6 relative ${
                currentPlan === "basic"
                  ? "border-blue-500 bg-blue-50"
                  : selectedPlan === "basic"
                  ? "border-blue-500 bg-blue-50"
                  : "border-blue-300 bg-white"
              }`}
            >
              {/* 추천 배지 */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  추천
                </span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">🔵 BASIC</h3>
                  <p className="text-xs text-gray-600 mt-1">대부분의 협회가 선택한 플랜</p>
                </div>
                {currentPlan === "basic" && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    현재 사용 중
                  </span>
                )}
              </div>

              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900">
                  월 {TOURNAMENT_PLAN_PRICES.basic.monthly?.toLocaleString()}원
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  또는
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  대회당 {TOURNAMENT_PLAN_PRICES.basic.perCompetition?.toLocaleString()}원
                </p>
              </div>

              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>대회 무제한</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>선수 명단 엑셀 다운로드</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>미제출 팀 알림 자동화</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>플랫폼 로고 제거</span>
                </li>
              </ul>

              {/* 천재 포인트: 비용 절감 강조 */}
              <div className="mb-6 pt-3 border-t border-blue-200 bg-blue-50 -mx-2 px-2 py-2 rounded">
                <p className="text-xs text-blue-800 font-medium">
                  ⭐ 대회 운영 인력 1명 분의 업무를 줄여줍니다.
                </p>
              </div>

              {currentPlan === "basic" ? (
                <button
                  disabled
                  className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  현재 플랜
                </button>
              ) : (
                <button
                  onClick={() => handleSelectPlan("basic")}
                  className={`w-full py-2 px-4 border-2 rounded-lg font-semibold transition-colors ${
                    selectedPlan === "basic"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-blue-500 bg-white text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  이 기능 사용하기
                </button>
              )}
            </div>

            {/* PRO */}
            <div
              className={`border-2 rounded-lg p-6 ${
                currentPlan === "pro"
                  ? "border-purple-500 bg-purple-50"
                  : selectedPlan === "pro"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">🟣 PRO</h3>
                {currentPlan === "pro" && (
                  <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded">
                    현재 사용 중
                  </span>
                )}
              </div>

              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900">
                  월 {TOURNAMENT_PLAN_PRICES.pro.monthly?.toLocaleString()}원
                </p>
              </div>

              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>BASIC 전부 포함</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>참가비 결제 연동</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>현장 체크인 (QR)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>자동 영수증</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>우선 지원</span>
                </li>
              </ul>

              {currentPlan === "pro" ? (
                <button
                  disabled
                  className="w-full py-2 px-4 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  현재 플랜
                </button>
              ) : (
                <button
                  onClick={() => handleSelectPlan("pro")}
                  className={`w-full py-2 px-4 border-2 rounded-lg font-semibold transition-colors ${
                    selectedPlan === "pro"
                      ? "border-purple-500 bg-purple-600 text-white"
                      : "border-purple-500 bg-white text-purple-600 hover:bg-purple-50"
                  }`}
                >
                  대회 운영 시작하기
                </button>
              )}
            </div>
          </div>

          {/* 심리적 안전장치 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-col md:flex-row gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>언제든지 플랜 변경이 가능합니다.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>대회 종료 후 자동 결제되지 않습니다.</span>
              </div>
            </div>
          </div>

          {/* 선택된 플랜 상세 영역 (심리 안정 장치) */}
          {selectedPlan && selectedPlan !== currentPlan && (
            <div className="mt-6 pt-6 border-t-2 border-blue-200 bg-blue-50 rounded-lg p-6">
              <div className="mb-4">
                <h4 className="text-lg font-bold text-gray-900 mb-2">
                  선택한 플랜: {getTournamentPlanName(selectedPlan)}
                </h4>
                
                {/* 포함 기능 */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">포함 기능</p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {selectedPlan === "basic" && (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500">•</span>
                          <span>선수 명단 엑셀 다운로드</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500">•</span>
                          <span>참가팀/선수 현황 자동 정리</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500">•</span>
                          <span>미제출 팀 자동 알림</span>
                        </li>
                      </>
                    )}
                    {selectedPlan === "pro" && (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-500">•</span>
                          <span>BASIC 모든 기능</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-500">•</span>
                          <span>참가비 결제 연동</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-500">•</span>
                          <span>자동 입금 확인 / 영수증</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-500">•</span>
                          <span>현장 체크인 (QR)</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {/* 결제 금액 */}
                <div className="mb-4 pb-4 border-b border-blue-200">
                  <p className="text-sm font-semibold text-gray-700 mb-1">결제 금액</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedPlan === "basic" && (
                      <>
                        월 {TOURNAMENT_PLAN_PRICES.basic.monthly?.toLocaleString()}원
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          (VAT 별도)
                        </span>
                      </>
                    )}
                    {selectedPlan === "pro" && (
                      <>
                        월 {TOURNAMENT_PLAN_PRICES.pro.monthly?.toLocaleString()}원
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          (VAT 별도)
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* 심리적 안전장치 (강조) */}
                <div className="space-y-2 text-xs text-gray-600 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">※</span>
                    <span>대회 종료 후 자동 결제되지 않습니다.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">※</span>
                    <span>언제든지 플랜 변경이 가능합니다.</span>
                  </div>
                </div>
              </div>

              {/* CTA 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  나중에
                </button>
                <button
                  onClick={handleUpgrade}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  {selectedPlan === "basic" ? "이 기능 사용하기" : "대회 운영 시작하기"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
