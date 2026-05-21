/**
 * StepHero
 * Step 4: Hero 이미지 선택
 */

import { useBuilder } from "../BuilderContext";
import StepShell from "../components/StepShell";
import WizardFooter from "../components/WizardFooter";
import { heroImages } from "../data/builderData";
import { Check, AlertCircle } from "lucide-react";

export default function StepHero() {
  const { values, setValues, next, back, error, setError } = useBuilder();

  const handleNext = () => {
    if (!values.heroImageUrl) {
      setError("Hero 이미지를 선택해주세요");
      return;
    }
    setError(null);
    next();
  };

  return (
    <StepShell
        stepNumber={5}
        totalSteps={7}
        title="Hero 이미지를 선택하세요"
        description="협회 홈페이지 상단에 표시될 이미지입니다"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {heroImages.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => {
                setValues({ ...values, heroImageUrl: image.url });
                setError(null); // 선택 시 에러 초기화
              }}
              className={`
                relative overflow-hidden rounded-xl border-2 transition-all hover:shadow-lg
                ${values.heroImageUrl === image.url
                  ? "border-blue-600 ring-4 ring-blue-200 dark:ring-blue-800"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                }
              `}
            >
              <div className="aspect-video relative">
                <img
                  src={image.url}
                  alt={image.label}
                  className="w-full h-full object-cover"
                />
                {values.heroImageUrl === image.url && (
                  <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
              </div>
              <div className="p-3 bg-white dark:bg-gray-800">
                <div className="font-medium text-gray-900 dark:text-white text-center">
                  {image.label}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mt-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <WizardFooter
          onNext={handleNext}
          onBack={back}
        />
      </StepShell>
  );
}
