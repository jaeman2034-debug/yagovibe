/**
 * StepSport
 * Step 2: 종목 선택
 */

import { useBuilder } from "../BuilderContext";
import SelectCard from "../components/SelectCard";
import StepShell from "../components/StepShell";
import WizardFooter from "../components/WizardFooter";
import { sports } from "../data/builderData";
import { AlertCircle } from "lucide-react";

export default function StepSport() {
  const { values, setValues, next, back, error, setError } = useBuilder();

  const handleNext = () => {
    if (!values.sport) {
      setError("종목을 선택해주세요");
      return;
    }
    setError(null);
    next();
  };

  return (
    <StepShell
        stepNumber={3}
        totalSteps={7}
        title="어떤 종목 협회를 만드시나요?"
        description="종목에 따라 맞춤형 템플릿이 제공됩니다"
      >
        <div className="grid grid-cols-2 gap-4">
          {sports.map((sport) => (
            <SelectCard
              key={sport.id}
              selected={values.sport === sport.id}
              onClick={() => {
                setValues({ ...values, sport: sport.id });
                setError(null); // 선택 시 에러 초기화
              }}
            >
              <div className="flex flex-col items-center justify-center text-lg font-medium">
                <span className="text-4xl mb-2">{sport.icon}</span>
                <span className="text-gray-900 dark:text-white">
                  {sport.label}
                </span>
              </div>
            </SelectCard>
          ))}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <WizardFooter onNext={handleNext} onBack={back} />
      </StepShell>
  );
}
