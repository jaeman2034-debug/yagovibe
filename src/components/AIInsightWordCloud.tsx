import React, { useEffect, useState, useMemo, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Hash } from "lucide-react";

interface WeeklyInsight {
  content?: string;
  generatedAt?: any;
  reportCount?: number;
  createdAt?: any;
}

// 한국어 불용어 목록 (간단한 버전)
const STOPWORDS = new Set([
  "이번",
  "주요",
  "트렌드",
  "요약",
  "포인트",
  "키워드",
  "예측",
  "다음",
  "그리고",
  "그런",
  "있는",
  "있는",
  "것",
  "수",
  "등",
  "및",
  "또한",
  "때문",
  "위해",
  "따라",
  "대한",
  "통해",
  "기준",
  "관련",
  "대해",
  "이후",
  "이전",
  "이상",
  "이하",
  "그",
  "이",
  "저",
  "그것",
  "이것",
  "저것",
  "가",
  "이",
  "을",
  "를",
  "의",
  "에",
  "에서",
  "로",
  "으로",
  "와",
  "과",
  "도",
  "만",
  "부터",
  "까지",
  "처럼",
  "같이",
  "보다",
  "마다",
  "조차",
  "마저",
  "은",
  "는",
  "이었",
  "였",
  "있",
  "없",
  "하",
  "되",
  "되",
  "되",
  "되",
  "되",
  "되",
]);

// 한국어 단어 추출 및 정규화
function extractKoreanWords(text: string): string[] {
  // JSON 형식 파싱 시도
  let processedText = text;

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const parts: string[] = [];

      if (parsed.trends) parts.push(parsed.trends);
      if (parsed.keywords && Array.isArray(parsed.keywords)) {
        // 배열의 각 키워드를 개별적으로 처리
        parsed.keywords.forEach((kw: string) => {
          if (typeof kw === "string") {
            // 해시태그 제거 후 추가
            parts.push(kw.replace(/^#+/, "").trim());
          }
        });
      }
      if (parsed.predictions && Array.isArray(parsed.predictions)) {
        parts.push(...parsed.predictions);
      }

      if (parts.length > 0) {
        processedText = parts.join(" ");
      }
    }
  } catch (e) {
    // JSON 파싱 실패 시 원본 텍스트 사용
  }

  // 해시태그 추출 (#키워드 형태)
  const hashtags: string[] = [];
  const hashtagRegex = /#([ㄱ-ㅎ가-힣a-zA-Z0-9]+)/g;
  let match;
  while ((match = hashtagRegex.exec(processedText)) !== null) {
    hashtags.push(match[1]);
  }

  // 해시태그 제거 후 일반 텍스트 처리
  const withoutHashtags = processedText.replace(/#[ㄱ-ㅎ가-힣a-zA-Z0-9]+/g, " ");

  // 한국어 문자와 영문, 숫자만 추출 (해시태그는 이미 추출됨)
  const cleaned = withoutHashtags
    .replace(/[^ㄱ-ㅎ가-힣a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 단어 분리 (한국어는 공백 기준, 2자 이상)
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .filter((w) => !STOPWORDS.has(w))
    .filter((w) => !/^\d+$/.test(w)); // 숫자만 있는 단어 제외

  // 해시태그와 일반 단어를 합치기
  return [...hashtags, ...words];
}

export default function AIInsightWordCloud() {
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [wordCloudError, setWordCloudError] = useState(false);

  // Firestore 실시간 구독
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "insights", "weekly"),
      (snap) => {
        if (snap.exists()) {
          setInsight(snap.data() as WeeklyInsight);
        } else {
          setInsight(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("인사이트 구독 오류:", error);
        setInsight(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 단어 빈도 계산
  const wordData = useMemo(() => {
    if (!insight?.content) return [];

    const words = extractKoreanWords(insight.content);

    // 빈도 계산
    const freq: Record<string, number> = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }

    // 상위 20개 추출
    const entries = Object.entries(freq)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    return entries;
  }, [insight?.content]);

  // 워드클라우드 렌더링을 위한 ref
  const wordCloudRef = useRef<HTMLDivElement>(null);

  // 워드클라우드 렌더링 (동적 import 사용)
  useEffect(() => {
    if (!wordData.length || !wordCloudRef.current || wordCloudError) return;

    let mounted = true;

    // d3-cloud를 동적으로 import
    const loadWordCloud = async () => {
      try {
        const d3Cloud = await import("d3-cloud");

        if (!mounted || !wordCloudRef.current) return;

        // 기존 SVG 제거
        if (wordCloudRef.current.firstChild) {
          wordCloudRef.current.removeChild(wordCloudRef.current.firstChild);
        }

        // SVG 생성
        const width = wordCloudRef.current.clientWidth || 600;
        const height = 340;

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", width.toString());
        svg.setAttribute("height", height.toString());
        svg.style.width = "100%";
        svg.style.height = "100%";

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${width / 2},${height / 2})`);
        svg.appendChild(g);

        // d3-cloud 설정
        const layout = (d3Cloud as any).default
          ? (d3Cloud as any).default()
          : (d3Cloud as any)();

        layout
          .size([width, height])
          .words(
            wordData.map((d) => ({
              text: d.text,
              size: 16 + (d.value / wordData[0].value) * 44, // 16px ~ 60px
            }))
          )
          .padding(5)
          .rotate(() => (Math.random() < 0.5 ? 0 : -90))
          .fontSize((d: any) => d.size)
          .font("Arial")
          .on("end", (words: any[]) => {
            if (!mounted || !wordCloudRef.current) return;

            // 기존 요소 제거
            while (g.firstChild) {
              g.removeChild(g.firstChild);
            }

            // 텍스트 요소 추가 (색상 그라데이션 적용)
            const colors = [
              "#6366f1", // indigo
              "#8b5cf6", // purple
              "#a855f7", // purple-500
              "#ec4899", // pink
              "#f59e0b", // amber
              "#10b981", // emerald
              "#3b82f6", // blue
              "#ef4444", // red
            ];

            words.forEach((word: any, index: number) => {
              const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
              text.setAttribute("font-size", word.size.toString());
              text.setAttribute("font-family", word.font || "Arial");
              text.setAttribute("font-weight", "bold");
              // 빈도에 따라 색상 선택 (빈도가 높을수록 진한 색상)
              const colorIndex = Math.min(
                Math.floor((word.size - 16) / 10),
                colors.length - 1
              );
              text.setAttribute("fill", colors[colorIndex] || colors[0]);
              text.setAttribute("text-anchor", "middle");
              text.setAttribute(
                "transform",
                `translate(${word.x},${word.y}) rotate(${word.rotate})`
              );
              // 해시태그 표시 개선
              text.textContent = word.text.startsWith("#") ? word.text : word.text;
              g.appendChild(text);
            });

            if (wordCloudRef.current) {
              wordCloudRef.current.appendChild(svg);
            }
          });

        layout.start();
      } catch (error) {
        console.error("워드클라우드 생성 오류:", error);
        setWordCloudError(true);
        if (mounted && wordCloudRef.current) {
          const errorMsg = document.createElement("div");
          errorMsg.className = "text-sm text-red-500 text-center py-4";
          errorMsg.textContent = "워드클라우드를 로드할 수 없습니다";
          wordCloudRef.current.appendChild(errorMsg);
        }
      }
    };

    loadWordCloud();

    return () => {
      mounted = false;
      if (wordCloudRef.current && wordCloudRef.current.firstChild) {
        wordCloudRef.current.removeChild(wordCloudRef.current.firstChild);
      }
    };
  }, [wordData, wordCloudError]);

  return (
    <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Hash className="h-5 w-5 text-indigo-500 dark:text-indigo-400" /> 주간 주요 키워드
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          AI 인사이트 요약문에서 추출된 주요 단어 빈도 (상위 20개)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : wordData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-sm text-neutral-500 dark:text-gray-400">
              분석할 텍스트가 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 워드클라우드 */}
            {!wordCloudError && (
              <div className="h-[400px] border border-neutral-100 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  워드클라우드
                </h3>
                <div
                  ref={wordCloudRef}
                  className="h-[340px] w-full flex items-center justify-center"
                />
              </div>
            )}
            {wordCloudError && (
              <div className="h-[400px] border border-neutral-100 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    워드클라우드를 사용할 수 없습니다
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    막대 차트를 참고해주세요
                  </p>
                </div>
              </div>
            )}

            {/* 막대 차트 */}
            <div className="h-[400px]">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                빈도 차트 (상위 {wordData.length}개)
              </h3>
              <ResponsiveContainer width="100%" height="340px">
                <BarChart
                  data={wordData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="text"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="#6b7280"
                  />
                  <YAxis allowDecimals={false} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}회`, "빈도"]}
                    labelFormatter={(label: string) => `키워드: ${label}`}
                  />
                  <Bar
                    dataKey="value"
                    fill="#6366F1"
                    name="빈도"
                    radius={[4, 4, 0, 0]}
                    fillOpacity={0.8}
                  >
                    {wordData.map((entry, index) => {
                      const colors = [
                        "#6366f1", // indigo
                        "#8b5cf6", // purple
                        "#a855f7", // purple-500
                        "#ec4899", // pink
                        "#f59e0b", // amber
                        "#10b981", // emerald
                        "#3b82f6", // blue
                      ];
                      const colorIndex = Math.min(
                        Math.floor((index / wordData.length) * colors.length),
                        colors.length - 1
                      );
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[colorIndex]}
                          fillOpacity={0.8}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

