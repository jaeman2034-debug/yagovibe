/**
 * 🔥 온보딩 Step 4: 완료
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { OnboardingData } from "@/hooks/useOnboarding";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackOnboarding } from "@/lib/analytics";
import { applyReferral } from "@/lib/applyReferral";
import { sanitizePostLoginRedirectTarget } from "@/lib/auth/sanitizePostLoginRedirect";

interface StepDoneProps {
  variant?: "A" | "B";
  data: OnboardingData;
  complete: () => Promise<void>;
  goBack: (prevStep: number) => void | Promise<void>;
}

export default function StepDone({ variant = "A", data, complete, goBack }: StepDoneProps) {
  const { profile } = useAuthUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 🔥 실험군 확인
  const experimentVariant = variant || profile?.experiment?.onboarding_v1 || "A";

  useEffect(() => {
    // 📊 온보딩 단계 진입 이벤트 (variant 포함)
    trackOnboarding.step({ 
      step: 4, 
      stepName: 'done',
      variant: experimentVariant,
    });
  }, [experimentVariant]);

  const handleComplete = async () => {
    setLoading(true);
    try {
      await complete();
      
      // 📊 온보딩 완료 이벤트 (variant 포함)
      trackOnboarding.complete({ 
        totalSteps: 5,
        variant: experimentVariant,
      });
      
      // 🔥 추천 코드 적용 (온보딩 완료 시점)
      await applyReferral();
      
      // 🔥 완료 후 홈으로 이동 (OnboardingRoute가 자동 처리하지만 명시적으로)
      const afterOnboarding = sessionStorage.getItem("afterOnboarding");
      if (afterOnboarding) {
        sessionStorage.removeItem("afterOnboarding");
        const safe = sanitizePostLoginRedirectTarget(afterOnboarding);
        navigate(safe ?? "/hub");
      } else {
        navigate("/hub");
      }
    } catch (error) {
      console.error("❌ [StepDone] 완료 처리 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    setLoading(true);
    try {
      await goBack(3);
    } catch (error) {
      console.error("❌ [StepDone] 뒤로가기 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-none md:max-w-3xl">
        <CardHeader>
          <CardTitle>준비 완료 🎉</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-lg">
              {data.displayName ? `${data.displayName}님, ` : ""}
              환영합니다!
            </p>
            <p className="text-muted-foreground">
              이제 YAGO SPORTS를 시작할 준비가 되었어요.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="flex-1"
            >
              뒤로
            </Button>
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "처리 중..." : "시작하기"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
