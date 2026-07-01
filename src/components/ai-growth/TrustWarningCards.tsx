import { AlertTriangle, Shield } from "lucide-react";

export function TrustWarningCards() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <div>
            <p className="font-semibold">AI 제안 전용</p>
            <p className="mt-1 text-amber-900/90">
              AI 제안은 확률 기반 참고 정보입니다. 코치 승인 없이 노출할 수 없습니다.{" "}
              <strong>AI 신뢰도는 진실과 동일하지 않습니다.</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <div className="flex gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden />
          <div>
            <p className="font-semibold">학부모 보호 원칙</p>
            <p className="mt-1">
              성장 언어는 반드시 격려 중심, 비판단적, 발달 중심이어야 합니다.
            </p>
            <p className="mt-2 text-xs text-slate-600">
              <strong>금지:</strong> 랭킹 · 점수화 · 비교 · 심리 낙인 · 자동 게시
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50/80 px-4 py-2 text-xs text-violet-900">
        <strong>검증 전용 콘솔</strong> — 운영 자동화 제품이 아닙니다. 목적: vocabulary,
        학부모 문구, 코치 워크플로우, 애매/피로 관찰 (Week 1 / Thin MVP).
      </div>
    </div>
  );
}
