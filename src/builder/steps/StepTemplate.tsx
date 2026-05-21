/**
 * StepTemplate
 * Step 5: 템플릿 선택
 */

import { useState } from "react";
import { useBuilder } from "../BuilderContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import StepShell from "../components/StepShell";
import WizardFooter from "../components/WizardFooter";
import { templates } from "../data/builderData";

export default function StepTemplate() {
  const { values, setValues, next, back } = useBuilder();
  const [newEmail, setNewEmail] = useState("");

  // 이메일 추가
  const handleAddEmail = () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert("올바른 이메일 주소를 입력하세요.");
      return;
    }

    if (values.adminEmails.includes(trimmedEmail)) {
      alert("이미 등록된 이메일 주소입니다.");
      return;
    }

    setValues({
      ...values,
      adminEmails: [...values.adminEmails, trimmedEmail],
    });
    setNewEmail("");
  };

  // 이메일 삭제
  const handleRemoveEmail = (index: number) => {
    setValues({
      ...values,
      adminEmails: values.adminEmails.filter((_, i) => i !== index),
    });
  };

  return (
    <StepShell
        stepNumber={6}
        totalSteps={7}
        title="템플릿을 선택하세요"
        description="템플릿에 따라 기본 설정이 자동으로 적용됩니다"
      >
        <div className="space-y-6">
          {/* 템플릿 선택 */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                id="nowon-template"
                name="template"
                value={templates[0].id}
                checked={values.templateId === templates[0].id}
                onChange={(e) =>
                  setValues({ ...values, templateId: e.target.value })
                }
                className="mt-1"
              />
              <label htmlFor="nowon-template" className="flex-1 cursor-pointer">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {templates[0].name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {templates[0].features.map((feature, idx) => (
                    <div key={idx}>• {feature}</div>
                  ))}
                </div>
              </label>
            </div>
          </div>

          {/* 관리자 이메일 */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              관리자 이메일 (선택)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              리포트 수신자로 자동 등록됩니다
            </p>

            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="admin@association.kr"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddEmail();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleAddEmail} variant="outline">
                추가
              </Button>
            </div>

            {values.adminEmails.length > 0 && (
              <div className="space-y-2">
                {values.adminEmails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <span className="text-sm text-gray-900 dark:text-white">
                      {email}
                    </span>
                    <button
                      onClick={() => handleRemoveEmail(index)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <WizardFooter onNext={next} onBack={back} />
      </StepShell>
  );
}
