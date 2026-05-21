/**
 * 🔥 온보딩 Step 2: 종목 선택
 */

import { useState, useEffect } from "react";
import type { OnboardingData } from "@/hooks/useOnboarding";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackOnboarding } from "@/lib/analytics";

interface StepSportProps {
  variant?: "A" | "B";
  data: OnboardingData;
  saveStep: (nextStep: number, payload: Partial<OnboardingData>) => Promise<void>;
  goBack: (prevStep: number) => void | Promise<void>;
}

const SPORTS = [
  "축구",
  "농구",
  "야구",
  "배구",
  "골프",
  "테니스",
  "러닝",
  "수영",
  "헬스/피트니스",
  "배드민턴",
  "탁구",
  "요가/필라테스",
  "클라이밍",
];

export default function StepSport({ variant = "A", data, saveStep, goBack }: StepSportProps) {
  const { profile } = useAuthUser();
  const [sport, setSport] = useState(data.sport ?? "");
  const [loading, setLoading] = useState(false);

  // 🔥 실험군 확인
  const experimentVariant = variant || profile?.experiment?.onboarding_v1 || "A";

  // 🔥 기존 데이터가 있으면 불러오기
  useEffect(() => {
    if (data.sport) {
      setSport(data.sport);
    }
    
    // 📊 온보딩 단계 진입 이벤트 (variant 포함)
    trackOnboarding.step({ 
      step: 2, 
      stepName: 'sport',
      variant: experimentVariant,
    });
  }, [data.sport, experimentVariant]);

  const handleNext = async () => {
    if (!sport) return;

    setLoading(true);
    try {
      await saveStep(3, { sport });
    } catch (error) {
      console.error("❌ [StepSport] 저장 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    setLoading(true);
    try {
      await goBack(1);
    } catch (error) {
      console.error("❌ [StepSport] 뒤로가기 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-none md:max-w-3xl">
        <CardHeader>
          <CardTitle>주로 하는 종목을 선택해주세요</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {SPORTS.map((item) => (
              <Button
                key={item}
                variant={sport === item ? "default" : "outline"}
                onClick={() => setSport(item)}
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
              disabled={!sport || loading}
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
