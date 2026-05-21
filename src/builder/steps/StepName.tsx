/**
 * StepName
 * Step 0: 조직 유형 선택
 * Step 1: 기본 정보 입력 (이름, 지역)
 */

import { useMemo, useState } from "react";
import { useBuilder } from "../BuilderContext";
import { Input } from "@/components/ui/input";
import SelectCard from "../components/SelectCard";
import StepShell from "../components/StepShell";
import WizardFooter from "../components/WizardFooter";
import { organizationTypes, generateSlug } from "../data/builderData";
import { Trophy, GraduationCap, Users, Check, AlertCircle, Building2, MapPin } from "lucide-react";

export default function StepName() {
  const { step, values, setValues, next, back, error, setError } = useBuilder();

  // 다음 단계로 이동 (유효성 검사 포함)
  const handleNext = () => {
    if (step === 0) {
      // Step 0: 조직 유형 선택
      if (!values.organizationType) {
        setError("조직 유형을 선택해주세요");
        return;
      }
      setError(null);
      next();
    } else {
      // Step 1: 기본 정보 입력
      if (!values.name.trim()) {
        setError(
          values.organizationType === "federation"
            ? "협회명을 입력해주세요"
            : values.organizationType === "academy"
            ? "아카데미명을 입력해주세요"
            : "클럽명을 입력해주세요"
        );
        return;
      }
      if (!values.region.trim()) {
        setError("지역을 입력해주세요");
        return;
      }
      setError(null);
      next();
    }
  };

  // URL Preview 생성
  const urlPreview = useMemo(() => {
    if (!values.name.trim()) return "";
    const slug = generateSlug(values.name);
    return `yago.io/${slug}`;
  }, [values.name]);

  // Step 0: 조직 유형 선택
  if (step === 0) {
    return (
      <StepShell
        stepNumber={1}
        totalSteps={7}
        title="어떤 조직을 만드시나요?"
        description="조직 유형에 따라 다른 템플릿이 제공됩니다"
      >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {organizationTypes.map((type) => {
              const IconComponent =
                type.id === "federation"
                  ? Trophy
                  : type.id === "academy"
                  ? GraduationCap
                  : Users;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() =>
                    setValues({ ...values, organizationType: type.id as any })
                  }
                  className={`
                    p-6 border-2 rounded-xl text-left transition-all
                    ${values.organizationType === type.id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl shadow-lg"
                    }
                  `}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`
                        w-14 h-14 rounded-xl flex items-center justify-center transition-all
                        ${values.organizationType === type.id
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                        }
                      `}
                    >
                      <IconComponent className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-gray-900 dark:text-white">
                        {type.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {type.labelEn}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {type.description}
                  </p>
                </button>
              );
            })}
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
            backDisabled={true}
          />
        </StepShell>
    );
  }

  // Step 1: 기본 정보 입력
  return (
    <StepShell
        stepNumber={2}
        totalSteps={7}
        title={
          values.organizationType === "federation"
            ? "협회 생성"
            : values.organizationType === "academy"
            ? "아카데미 생성"
            : "클럽 생성"
        }
        description="몇 단계만 입력하면 조직 홈페이지가 자동으로 생성됩니다"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              {values.organizationType === "federation"
                ? "협회명"
                : values.organizationType === "academy"
                ? "아카데미명"
                : "클럽명"}{" "}
              *
              {values.name.trim() && (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              )}
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder={
                  values.organizationType === "federation"
                    ? "예: 노원구 축구협회 / 서울 농구협회"
                    : values.organizationType === "academy"
                    ? "예: 서울 유소년 아카데미"
                    : "예: 강남 FC"
                }
                value={values.name}
                onChange={(e) => {
                  setValues({ ...values, name: e.target.value });
                  setError(null); // 입력 시 에러 초기화
                }}
                className="w-full text-base h-12 pl-10 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* URL Preview */}
            {urlPreview && (
              <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
                  생성 URL
                </div>
                <div className="text-sm font-mono text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-2">
                  <span className="text-gray-400">https://</span>
                  {urlPreview}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              지역 *
              {values.region.trim() && (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              )}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder="예: 서울특별시 노원구"
                value={values.region}
                onChange={(e) => {
                  setValues({ ...values, region: e.target.value });
                  setError(null); // 입력 시 에러 초기화
                }}
                className="w-full text-base h-12 pl-10 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              시/구/군 단위로 입력하세요
            </p>
          </div>
        </div>

        {/* 생성 안내 UI */}
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mt-6 border border-gray-200 dark:border-gray-600">
          <p className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="text-lg">⚡</span>
            생성 시 자동으로 만들어집니다
          </p>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span>협회 홈페이지</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span>관리자 대시보드</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span>기본 메뉴 및 기능</span>
            </li>
          </ul>
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
