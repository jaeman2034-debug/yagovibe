import { useEffect } from 'react';
import { X, Lightbulb, MessageSquare, HelpCircle } from 'lucide-react';

interface AIAssistBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AI 도움말 Bottom Sheet
 * 드래그 아래 방향 시 표시
 */
export function AIAssistBottomSheet({ isOpen, onClose }: AIAssistBottomSheetProps) {
  // 🔥 스크롤 락 제거 - CSS로 처리하므로 JS에서 직접 조작하지 않음
  // useEffect(() => {
  //   if (isOpen) {
  //     document.body.style.overflow = 'hidden';
  //   } else {
  //     document.body.style.overflow = '';
  //   }
  //   return () => {
  //     document.body.style.overflow = '';
  //   };
  // }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">AI는 이런 걸 도와줘요</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          {/* 입력 도와주기 */}
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
            <MessageSquare className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">입력 도와주기</h3>
              <p className="text-sm text-gray-600">
                "이메일 입력", "비밀번호 입력" 같은 음성 명령으로 필드를 빠르게 채울 수 있어요.
              </p>
            </div>
          </div>

          {/* 오류 설명 */}
          <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-xl">
            <HelpCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">오류 설명</h3>
              <p className="text-sm text-gray-600">
                입력 오류가 발생하면 AI가 친절하게 설명해드려요.
              </p>
            </div>
          </div>

          {/* 가입 단계 안내 */}
          <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl">
            <Lightbulb className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">가입 단계 안내</h3>
              <p className="text-sm text-gray-600">
                다음 단계가 무엇인지, 어떻게 진행하면 되는지 안내해드려요.
              </p>
            </div>
          </div>

          {/* 사용 팁 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 text-center">
              💡 마이크를 위로 드래그하면 음성 입력을 시작할 수 있어요
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

