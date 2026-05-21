/**
 * 대진표 섹션 컴포넌트 (Public)
 * 
 * UI 규칙:
 * - preparing: "대진표는 아직 확정되지 않았습니다."
 * - confirmed: "✔ 공식 대진표"
 */

import type { BracketStatus } from "@/types/tournament";
import { BracketStatus as BracketStatusComponent } from "./BracketStatus";

interface BracketSectionProps {
  status: BracketStatus;
  bracketUrl?: string;
}

export function BracketSection({ status, bracketUrl }: BracketSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">대진표</h3>
      
      {status === "preparing" ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            대진표는 아직 확정되지 않았습니다. 공식 확정 시 본 화면에 공개됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-700 font-medium">✔ 공식 대진표</span>
            </div>
            <BracketStatusComponent status={status} />
          </div>
          
          {bracketUrl && (
            <div className="mt-4">
              <a
                href={bracketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                대진표 보기 →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

