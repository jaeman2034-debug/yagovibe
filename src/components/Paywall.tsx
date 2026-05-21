// src/components/Paywall.tsx
// 🔥 Paywall 컴포넌트 (4개 트리거만)

// import { X } from "lucide-react"; // lucide-react가 없으면 주석 처리
import { useEffect } from "react";
import { track } from "@/lib/analytics";

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: "unpaid_notification" | "payment_link" | "attendance_stats" | "multiple_admins";
  plan?: string;
  price?: number;
}

export default function Paywall({ isOpen, onClose, trigger, plan = "TEAM_PRO", price = 29000 }: PaywallProps) {
  // 🔥 Paywall 노출 추적
  useEffect(() => {
    if (isOpen) {
      track("paywall_impression", {
        trigger,
        plan,
      });
    }
  }, [isOpen, trigger, plan]);

  if (!isOpen) return null;

          const getTitle = () => {
            switch (trigger) {
              case "unpaid_notification":
                return plan === "ACADEMY_PRO" ? "미납 알림" : "미납자 자동 알림";
              case "payment_link":
                return plan === "ACADEMY_PRO" ? "수강료 청구" : "회비 결제 링크 생성";
              case "attendance_stats":
                return "출석 통계 보기";
              case "multiple_admins":
                return "관리자 2명 이상";
              default:
                return "Pro 기능";
            }
          };

          const getDescription = () => {
            switch (trigger) {
              case "unpaid_notification":
                return "🔒 Pro 팀 전용 기능입니다\n팀 운영을 자동화하세요";
              case "payment_link":
                return "🔒 Pro 팀 전용 기능입니다\n팀 운영을 자동화하세요";
              case "attendance_stats":
                return "🔒 Pro 팀 전용 기능입니다\n팀 운영을 자동화하세요";
              case "multiple_admins":
                return "🔒 Pro 팀 전용 기능입니다\n팀 운영을 자동화하세요";
              default:
                return "🔒 Pro 팀 전용 기능입니다\n팀 운영을 자동화하세요";
            }
          };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">💰 Pro 업그레이드</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">{getTitle()}</h3>
          <p className="text-gray-600">{getDescription()}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">{plan} 플랜</h4>
          <p className="text-2xl font-bold text-blue-900 mb-2">월 {price.toLocaleString()}원</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ 미납자 자동 알림</li>
            <li>✅ 회비 결제 링크 생성</li>
            <li>✅ 출석 통계 보기</li>
            <li>✅ 관리자 2명 이상</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              // 🔥 Analytics: 업그레이드 취소 추적
              track("upgrade_cancel", {
                trigger,
                plan,
              });
              onClose();
            }}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            나중에
          </button>
          <button
            onClick={() => {
              // 🔥 Analytics: 업그레이드 클릭 추적
              track("upgrade_click", {
                trigger,
                plan,
                price,
              });
              // TODO: 결제 페이지로 이동
              alert("결제 페이지로 이동 (구현 예정)");
            }}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            업그레이드
          </button>
        </div>
      </div>
    </div>
  );
}

