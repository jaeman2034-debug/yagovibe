/**
 * 🔥 온보딩 Step 0: 이름 입력
 */

import { useState, useEffect } from "react";
import type { OnboardingData } from "@/hooks/useOnboarding";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trackOnboarding } from "@/lib/analytics";

interface StepNameProps {
  variant?: "A" | "B";
  data: OnboardingData;
  saveStep: (nextStep: number, payload: Partial<OnboardingData>) => Promise<void>;
}

export default function StepName({ variant = "A", data, saveStep }: StepNameProps) {
  const { profile } = useAuthUser();
  const [name, setName] = useState(data.displayName ?? "");
  const [loading, setLoading] = useState(false);

  // 🔥 실험군 확인 (props 우선, 없으면 profile에서)
  const experimentVariant = variant || profile?.experiment?.onboarding_v1 || "A";

  // 🔥 기존 데이터가 있으면 불러오기
  useEffect(() => {
    if (data.displayName) {
      setName(data.displayName);
    }
    
    // 📊 온보딩 단계 진입 이벤트 (variant 포함)
    trackOnboarding.step({ 
      step: 0, 
      stepName: 'name',
      variant: experimentVariant,
    });
  }, [data.displayName, experimentVariant]);

  const handleNext = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await saveStep(1, { displayName: name.trim() });
    } catch (error) {
      console.error("❌ [StepName] 저장 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-none md:max-w-3xl">
        <CardHeader>
          <CardTitle>이름을 알려주세요</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              onKeyPress={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleNext();
                }
              }}
            />
          </div>

          <Button
            onClick={handleNext}
            disabled={!name.trim() || loading}
            className="w-full"
          >
            {loading ? "저장 중..." : "다음"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
