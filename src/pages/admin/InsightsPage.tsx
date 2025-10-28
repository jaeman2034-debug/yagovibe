import { useState } from "react";
import { aggregateLogs } from "@/utils/aggregateLogs";
import { motion } from "framer-motion";
import { Loader2, RefreshCcw, Volume2, Share2, BarChart2 } from "lucide-react";
import YagoLayout from "@/layouts/YagoLayout";
import { YagoButton, YagoCard } from "@/components/ui/YagoComponents";
import {
  PieChart,
  Pie,
  Cell,
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function InsightsPage() {
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [logData, setLogData] = useState<any>(null);

  // GPT 인사이트 생성
  const generateInsight = async () => {
    setLoading(true);
    try {
      console.log("🔮 AI 인사이트 생성 시작...");

      const logs = await aggregateLogs();
      console.log("📊 집계된 로그 데이터:", logs);
      setLogData(logs);

      const res = await fetch("/api/generateInsight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logs),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("✅ AI 인사이트 생성 완료:", data);
      setInsight(data);

    } catch (e) {
      console.error("❌ 인사이트 생성 실패:", e);
      alert(`인사이트 생성에 실패했습니다:\n${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // 음성 리포트
  const speakInsight = () => {
    if (!insight) return;
    setSpeaking(true);
    const utter = new SpeechSynthesisUtterance(
      `${insight.title}. ${insight.bullets.join(", ")}. ${insight.actions.join(", ")}`
    );
    utter.lang = "ko-KR";
    utter.onend = () => setSpeaking(false);
    speechSynthesis.speak(utter);
  };

  // Slack 공유
  const shareToSlack = async () => {
    if (!insight) return;

    try {
      console.log("📱 Slack 공유 시작...");

      const res = await fetch("/api/shareSlack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(insight),
      });

      const result = await res.json();
      console.log("📱 Slack 공유 결과:", result);

      if (result.success) {
        alert("✅ Slack으로 성공적으로 전송되었습니다!");
      } else {
        alert(`❌ Slack 전송 실패: ${result.message}`);
      }

    } catch (e) {
      console.error("❌ Slack 공유 실패:", e);
      alert(`Slack 공유에 실패했습니다:\n${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const COLORS = ["#4F46E5", "#22C55E", "#F97316", "#E11D48", "#0EA5E9"];

  return (
    <YagoLayout title="AI Insights Generator + 시각화">
      <div className="space-y-8">
        {/* 🧠 AI 인사이트 카드 */}
        <YagoCard title="🧠 오늘의 AI 인사이트" icon="🤖" gradient>
          <div className="space-y-6">
            {/* 액션 버튼들 */}
            <div className="flex flex-wrap gap-4">
              <YagoButton
                text="🔮 인사이트 생성"
                onClick={generateInsight}
                disabled={loading}
                loading={loading}
                icon={<RefreshCcw className="w-4 h-4" />}
                variant="primary"
              />
              {insight && (
                <>
                  <YagoButton
                    text="🔊 음성 리포트"
                    onClick={speakInsight}
                    disabled={speaking}
                    icon={<Volume2 className="w-4 h-4" />}
                    variant="accent"
                  />
                  <YagoButton
                    text="📱 Slack 공유"
                    onClick={shareToSlack}
                    icon={<Share2 className="w-4 h-4" />}
                    variant="secondary"
                  />
                </>
              )}
            </div>

            {/* 인사이트 내용 */}
            <div className="min-h-64">
              {!insight && !loading && (
                <div className="text-center py-12 text-white/70">
                  <p className="text-lg mb-2">아직 인사이트가 없습니다</p>
                  <p className="text-sm">"인사이트 생성" 버튼을 눌러주세요</p>
                </div>
              )}

              {loading && (
                <div className="text-center py-12 text-white/70">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-lg">로그 데이터를 집계 중입니다...</p>
                  <p className="text-sm">잠시만 기다려주세요</p>
                </div>
              )}

              {insight && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="bg-white/10 rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-4">{insight.title}</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white/90 mb-2">📊 주요 발견사항</h3>
                        <ul className="space-y-2">
                          {insight.bullets.map((b: string, i: number) => (
                            <li key={i} className="text-white/80 flex items-start gap-2">
                              <span className="text-yago-pink">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-white/90 mb-2">🎯 추천 액션</h3>
                        <ul className="space-y-2">
                          {insight.actions.map((a: string, i: number) => (
                            <li key={i} className="text-white/80 flex items-start gap-2">
                              <span className="text-yago-blue">→</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </YagoCard>

        {/* 📊 시각화 카드 */}
        {logData && (
          <YagoCard title="📊 데이터 시각화" icon="📈">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {/* 지역 분포 */}
              <div className="bg-white rounded-xl p-4 shadow-lg">
                <h3 className="font-semibold mb-4 text-center text-yago-purple">🌍 지역 분포</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={logData.geoSample?.slice(0, 5).map((g: string, i: number) => ({
                        name: g || `지역 ${i + 1}`,
                        value: 1,
                      })) || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name }) => name}
                    >
                      {(logData.geoSample?.slice(0, 5) || []).map((_: any, index: number) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-gray-500 mt-2">
                  총 {logData.geoSample?.length || 0}개 지역 샘플
                </p>
              </div>

              {/* 디바이스별 통계 */}
              <div className="bg-white rounded-xl p-4 shadow-lg">
                <h3 className="font-semibold mb-4 text-center text-yago-purple">📱 디바이스 비율</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={Object.entries(logData.devices || {}).map(([k, v]) => ({
                      name: k || 'unknown',
                      value: v
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="#6B7280"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#6B7280"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#4F46E5"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-gray-500 mt-2">
                  총 {Object.keys(logData.devices || {}).length}개 디바이스 유형
                </p>
              </div>

              {/* 액션 통계 */}
              <div className="bg-white rounded-xl p-4 shadow-lg">
                <h3 className="font-semibold mb-4 text-center text-yago-purple">⚡ 액션 트렌드</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={Object.entries(logData.actions || {}).map(([k, v]) => ({
                      name: k || 'unknown',
                      value: v
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="#6B7280"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#6B7280"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-gray-500 mt-2">
                  총 {Object.keys(logData.actions || {}).length}개 액션 유형
                </p>
              </div>
            </div>
          </YagoCard>
        )}

        {/* 📈 통계 요약 카드 */}
        {logData && (
          <YagoCard title="📈 통계 요약" icon="📊">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-yago-soft rounded-lg">
                <div className="text-2xl font-bold text-yago-purple">{logData.total || 0}</div>
                <div className="text-sm text-gray-600">총 로그</div>
              </div>
              <div className="text-center p-4 bg-yago-soft rounded-lg">
                <div className="text-2xl font-bold text-yago-purple">{logData.geoSample?.length || 0}</div>
                <div className="text-sm text-gray-600">지역 샘플</div>
              </div>
              <div className="text-center p-4 bg-yago-soft rounded-lg">
                <div className="text-2xl font-bold text-yago-purple">{Object.keys(logData.devices || {}).length}</div>
                <div className="text-sm text-gray-600">디바이스 유형</div>
              </div>
              <div className="text-center p-4 bg-yago-soft rounded-lg">
                <div className="text-2xl font-bold text-yago-purple">{Object.keys(logData.actions || {}).length}</div>
                <div className="text-sm text-gray-600">액션 유형</div>
              </div>
            </div>
          </YagoCard>
        )}

        {/* 추가 정보 카드 */}
        <YagoCard title="ℹ️ 사용법 안내" icon="📖">
          <div className="space-y-3 text-sm text-gray-600">
            <p><strong>1. 인사이트 생성:</strong> Firestore 로그를 분석하여 AI가 자동으로 인사이트를 생성합니다</p>
            <p><strong>2. 데이터 시각화:</strong> 지역 분포, 디바이스 비율, 액션 트렌드를 차트로 표시합니다</p>
            <p><strong>3. 음성 리포트:</strong> 생성된 인사이트를 음성으로 들을 수 있습니다</p>
            <p><strong>4. Slack 공유:</strong> 인사이트를 Slack 채널로 자동 전송합니다</p>
            <p className="text-xs text-gray-500 mt-4">
              * OpenAI API 키가 필요합니다. 환경 변수에서 VITE_OPENAI_API_KEY를 설정해주세요.
            </p>
          </div>
        </YagoCard>
      </div>
    </YagoLayout>
  );
}
