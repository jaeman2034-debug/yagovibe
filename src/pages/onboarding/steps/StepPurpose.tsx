/**
 * 🔥 온보딩 Step 1: 목적 선택
 */

import { useState, useEffect } from "react";
import type { OnboardingData } from "@/hooks/useOnboarding";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackOnboarding } from "@/lib/analytics";

interface StepPurposeProps {
  variant?: "A" | "B";
  data: OnboardingData;
  saveStep: (nextStep: number, payload: Partial<OnboardingData>) => Promise<void>;
  goBack: (prevStep: number) => void | Promise<void>;
}

const PURPOSES = [
  { value: "personal", label: "개인용", description: "혼자 운동하고 싶어요" },
  { value: "business", label: "업무용", description: "회사/단체 활동이에요" },
  { value: "team", label: "팀 활동", description: "팀과 함께 하고 싶어요" },
] as const;

export default function StepPurpose({ variant = "A", data, saveStep, goBack }: StepPurposeProps) {
  const { profile } = useAuthUser();
  const [purpose, setPurpose] = useState<"personal" | "business" | "team" | "">(
    (data.purpose as "personal" | "business" | "team") ?? ""
  );
  const [loading, setLoading] = useState(false);

  // 🔥 실험군 확인
  const experimentVariant = variant || profile?.experiment?.onboarding_v1 || "A";

  // 🔥 기존 데이터가 있으면 불러오기
  useEffect(() => {
    if (data.purpose) {
      setPurpose(data.purpose as "personal" | "business" | "team");
    }
    
    // 📊 온보딩 단계 진입 이벤트 (variant 포함)
    trackOnboarding.step({ 
      step: 1, 
      stepName: 'purpose',
      variant: experimentVariant,
    });
  }, [data.purpose, experimentVariant]);

  const handleNext = async () => {
    if (!purpose) return;

    setLoading(true);
    try {
      await saveStep(2, { purpose });
    } catch (error) {
      console.error("❌ [StepPurpose] 저장 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    setLoading(true);
    try {
      await goBack(0);
    } catch (error) {
      console.error("❌ [StepPurpose] 뒤로가기 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-none md:max-w-3xl">
        <CardHeader>
          <CardTitle>어떤 목적으로 사용하시나요?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {PURPOSES.map((item) => (
              <Button
                key={item.value}
                variant={purpose === item.value ? "default" : "outline"}
                className="w-full justify-start h-auto p-4"
                onClick={() => setPurpose(item.value)}
              >
                <div className="text-left">
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </Button>
            ))}
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
              onClick={handleNext}
              disabled={!purpose || loading}
              className="flex-1"
            >
              {loading ? "저장 중..." : "다음"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
