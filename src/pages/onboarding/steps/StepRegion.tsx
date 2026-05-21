/**
 * 🔥 온보딩 Step 3: 지역 선택
 */

import { useState, useEffect } from "react";
import type { OnboardingData } from "@/hooks/useOnboarding";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackOnboarding } from "@/lib/analytics";

interface StepRegionProps {
  variant?: "A" | "B";
  data: OnboardingData;
  saveStep: (nextStep: number, payload: Partial<OnboardingData>) => Promise<void>;
  goBack: (prevStep: number) => void | Promise<void>;
}

const REGIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

export default function StepRegion({ variant = "A", data, saveStep, goBack }: StepRegionProps) {
  const { profile } = useAuthUser();
  const [region, setRegion] = useState(data.region ?? "");
  const [loading, setLoading] = useState(false);

  // 🔥 실험군 확인
  const experimentVariant = variant || profile?.experiment?.onboarding_v1 || "A";

  // 🔥 기존 데이터가 있으면 불러오기
  useEffect(() => {
    if (data.region) {
      setRegion(data.region);
    }
    
    // 📊 온보딩 단계 진입 이벤트 (variant 포함)
    trackOnboarding.step({ 
      step: 3, 
      stepName: 'region',
      variant: experimentVariant,
    });
  }, [data.region, experimentVariant]);

  const handleNext = async () => {
    if (!region) return;

    setLoading(true);
    try {
      await saveStep(4, { region });
    } catch (error) {
      console.error("❌ [StepRegion] 저장 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    setLoading(true);
    try {
      await goBack(2);
    } catch (error) {
      console.error("❌ [StepRegion] 뒤로가기 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-none md:max-w-3xl">
        <CardHeader>
          <CardTitle>주로 활동하는 지역을 선택해주세요</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {REGIONS.map((item) => (
              <Button
                key={item}
                variant={region === item ? "default" : "outline"}
                onClick={() => setRegion(item)}
                className="h-auto py-3"
              >
                {item}
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
              disabled={!region || loading}
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
