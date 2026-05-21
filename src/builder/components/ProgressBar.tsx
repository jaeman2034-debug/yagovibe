/**
 * ProgressBar
 * Builder 진행 상태 표시 바
 */

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const stepLabels = [
    "조직 유형",
    "기본 정보",
    "종목 선택",
    "참가 대상",
    "Hero 이미지",
    "템플릿",
    "확인 및 생성",
  ];

  return (
    <div className="mb-8">
      {/* 진행 바 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Step {currentStep + 1} / {totalSteps}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-500">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step 점 표시 */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`
                w-2 h-2 rounded-full transition-all
                ${
                  index < currentStep
                    ? "bg-blue-600 w-8"
                    : index === currentStep
                    ? "bg-blue-600 w-3 h-3 ring-2 ring-blue-200 dark:ring-blue-800"
                    : "bg-gray-300 dark:bg-gray-600"
                }
              `}
            />
            {index < totalSteps - 1 && (
              <div
                className={`
                  h-0.5 w-8 transition-all
                  ${index < currentStep ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}
                `}
              />
            )}
          </div>
        ))}
      </div>

      {/* 현재 Step 라벨 */}
      <div className="text-center mt-3">
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
          {stepLabels[currentStep]}
        </p>
      </div>
    </div>
  );
}
