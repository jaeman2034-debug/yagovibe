/**
 * 🔥 LaunchChecklistPage - 출시 체크리스트 페이지
 * 
 * 경로: /admin/launch-checklist
 * 
 * 역할:
 * - 출시 전 필수 체크 항목 관리
 * - 테스트 시나리오 확인
 * 
 * UX 목적:
 * - 베타 출시 준비 완료 확인
 */

import { useState, useEffect } from "react";
import {
  LAUNCH_CHECKLIST,
  TEST_SCENARIOS,
  saveChecklist,
  loadChecklist,
  type ChecklistItem,
} from "@/utils/launchChecklist";
import { downloadChecklistPDF, downloadBetaGuidePDF } from "@/utils/betaChecklistPDF";
import { CheckCircle2, Circle, FileText, Play, Download } from "lucide-react";

/**
 * 🔥 출시 체크리스트 페이지
 */
export default function LaunchChecklistPage() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(LAUNCH_CHECKLIST);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "auth" | "data" | "ui" | "performance" | "security"
  >("all");

  useEffect(() => {
    const loaded = loadChecklist();
    setChecklist(loaded);
  }, []);

  const toggleCheck = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    saveChecklist(updated);
  };

  const filteredChecklist =
    selectedCategory === "all"
      ? checklist
      : checklist.filter((item) => item.category === selectedCategory);

  const categories = [
    { id: "all", label: "전체", count: checklist.length },
    {
      id: "auth",
      label: "인증",
      count: checklist.filter((item) => item.category === "auth").length,
    },
    {
      id: "data",
      label: "데이터",
      count: checklist.filter((item) => item.category === "data").length,
    },
    {
      id: "ui",
      label: "UI",
      count: checklist.filter((item) => item.category === "ui").length,
    },
    {
      id: "performance",
      label: "성능",
      count: checklist.filter((item) => item.category === "performance").length,
    },
    {
      id: "security",
      label: "보안",
      count: checklist.filter((item) => item.category === "security").length,
    },
  ];

  const completedCount = checklist.filter((item) => item.checked).length;
  const totalCount = checklist.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">🚀 출시 체크리스트</h1>
          <p className="text-neutral-600">
            베타 출시 전 필수 체크 항목을 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadChecklistPDF(checklist)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            체크리스트 PDF
          </button>
          <button
            onClick={downloadBetaGuidePDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            베타 가이드 PDF
          </button>
        </div>
      </div>

      {/* 진행률 */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-neutral-500 mb-1">진행률</div>
            <div className="text-3xl font-bold text-blue-600">
              {completedCount} / {totalCount}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-neutral-500 mb-1">완료율</div>
            <div className="text-3xl font-bold text-green-600">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              setSelectedCategory(
                cat.id as
                  | "all"
                  | "auth"
                  | "data"
                  | "ui"
                  | "performance"
                  | "security"
              )
            }
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-blue-600 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* 체크리스트 */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">체크리스트</h2>
        </div>
        <div className="divide-y">
          {filteredChecklist.map((item) => (
            <div
              key={item.id}
              className="p-4 flex items-start gap-4 hover:bg-neutral-50 transition-colors"
            >
              <button
                onClick={() => toggleCheck(item.id)}
                className="shrink-0 mt-0.5"
              >
                {item.checked ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <Circle className="w-6 h-6 text-neutral-300" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-semibold mb-1">{item.title}</div>
                <div className="text-sm text-neutral-600">{item.description}</div>
              </div>
              <div
                className={`shrink-0 px-2 py-1 rounded text-xs font-semibold ${
                  item.category === "auth"
                    ? "bg-blue-100 text-blue-700"
                    : item.category === "data"
                    ? "bg-green-100 text-green-700"
                    : item.category === "ui"
                    ? "bg-purple-100 text-purple-700"
                    : item.category === "performance"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {item.category}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 테스트 시나리오 */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            테스트 시나리오
          </h2>
        </div>
        <div className="p-4 space-y-4">
          {TEST_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              className="border rounded-lg p-4 hover:bg-neutral-50 transition-colors"
            >
              <div className="font-semibold mb-2 flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-600" />
                {scenario.title}
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm text-neutral-600 ml-6">
                {scenario.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {/* 출시 준비 완료 */}
      {progress === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            출시 준비 완료! 🎉
          </h2>
          <p className="text-green-600">
            모든 체크리스트 항목이 완료되었습니다. 베타 출시를 진행할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
