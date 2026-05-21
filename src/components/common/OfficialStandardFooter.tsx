/**
 * 공식 기준 하단 고정 문구 (모든 협회 공통)
 * 
 * Sprint 8: 공식 시스템화 & 첫 접속 UX
 * 
 * 원칙:
 * - 전국 어디든 동일 문구
 * - 모든 핵심 화면 하단 공통
 */

export function OfficialStandardFooter() {
  return (
    <footer className="mt-8 pt-6 border-t border-gray-200">
      <p className="text-sm text-gray-500 text-center">
        본 시스템은 협회 공식 기록을 기준으로 자동 운영됩니다.
      </p>
    </footer>
  );
}

