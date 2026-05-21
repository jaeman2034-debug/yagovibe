/**
 * 🔥 Lazy Signup 모달 컴포넌트 (STEP 4 LOCK)
 * 
 * 핵심 원칙:
 * - 행동을 막되, 흐름은 끊지 않는다
 * - 사용자는 "방해받았다"가 아니라 "자연스럽게 이어졌다"고 느껴야 한다
 * - 모달 카피 절대 수정 금지
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/common/Logo";
import { getPostSignupAction, clearPostSignupAction } from "@/lib/userState";
import { X } from "lucide-react";

interface LazySignupModalProps {
  open: boolean;
  onClose: () => void;
  onSignupComplete?: () => void; // 가입 완료 후 콜백
}

/**
 * Lazy Signup 모달
 * 
 * 트리거 조건:
 * - 행동 시도 시 (채팅 보내기, 판매 등록, 찜, 거래 요청, 결제)
 * - "보는 행위"에는 절대 모달 띄우지 않음
 * 
 * 사용 예시:
 * ```tsx
 * const [signupModalOpen, setSignupModalOpen] = useState(false);
 * 
 * <LazySignupModal
 *   open={signupModalOpen}
 *   onClose={() => setSignupModalOpen(false)}
 *   onSignupComplete={() => {
 *     // 가입 완료 후 원래 행동 복귀
 *     const action = getPostSignupAction();
 *     if (action) {
 *       resumeAction(action);
 *       clearPostSignupAction();
 *     }
 *   }}
 * />
 * ```
 */
export function LazySignupModal({
  open,
  onClose,
  onSignupComplete,
}: LazySignupModalProps) {
  const navigate = useNavigate();

  if (!open) return null;

  const handleSignup = () => {
    // 가입 전 액션을 state로 전달 (가입 화면에서 표시용)
    const postSignupAction = getPostSignupAction();
    
    // 가입 화면으로 이동 (초경량 가입 화면)
    navigate("/signup-lazy", {
      state: {
        returnTo: window.location.pathname,
        postSignupAction,
      },
    });
    
    onClose();
  };

  // 바깥 클릭 또는 ESC 키로 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ESC 키 감지
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <>
      {/* 배경 dim (약하게) */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
      />

      {/* 바텀시트 (모바일) / 센터 모달 (웹) */}
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-xl z-50 animate-slide-up md:animate-fade-in"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-labelledby="lazy-signup-title"
        aria-modal="true"
      >
        {/* X 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-12 md:pt-6">
          {/* 로고 */}
          <div className="flex justify-center mb-6">
            <Logo size={64} />
          </div>

          {/* 제목 (절대 수정 금지) */}
          <h2
            id="lazy-signup-title"
            className="text-xl font-bold text-gray-900 text-center mb-3"
          >
            이 기능을 사용하려면 회원가입이 필요해요
          </h2>

          {/* 보조 문구 (절대 수정 금지) */}
          <p className="text-gray-600 text-sm text-center mb-8">
            10초 만에 가입하고
            <br />
            하던 일을 계속할 수 있어요
          </p>

          {/* CTA 버튼 (단 하나, 절대 수정 금지) */}
          <button
            onClick={handleSignup}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-base shadow-lg transition-all"
          >
            가입하고 계속
          </button>

          {/* 나중에 하기 (작게) */}
          <button
            onClick={onClose}
            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            나중에 하기
          </button>
        </div>
      </div>

      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translate(-50%, 100%);
          }
          to {
            transform: translate(-50%, 0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
