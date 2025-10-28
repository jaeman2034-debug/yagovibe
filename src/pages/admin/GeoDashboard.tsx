import { useEffect, useState, useMemo } from "react";
import { GoogleMap, HeatmapLayer, useJsApiLoader } from "@react-google-maps/api";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import YagoLayout from "@/layouts/YagoLayout";
import { YagoButton, YagoCard, YagoStatCard } from "@/components/ui/YagoComponents";
import dayjs from "dayjs";

interface LogEntry {
  id?: string;
  ts?: { seconds: number };
  uid?: string | null;
  text?: string;
  intent?: string;
  action?: string;
  keyword?: string;
  lat?: number;
  lng?: number;
  resultCount?: number;
  note?: string;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 37.5665,
  lng: 126.978,
};

const defaultZoom = 12;

export default function GeoDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [intentFilter, setIntentFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Google Maps API 로더
  // ⚠️ 주의: 다른 컴포넌트(VoiceMapSearch, VoiceMap)와 스크립트 충돌 방지
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script-geo-dashboard", // 고유 ID 사용
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["visualization"],
    // 이미 로드된 스크립트 재사용 허용
    preventGoogleFontsLoading: false,
  });

  // Firestore 실시간 로그 수집
  useEffect(() => {
    const q = query(collection(db, "voice_logs"), orderBy("ts", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data: LogEntry[] = [];
      snap.forEach((doc) => {
        const logData = { id: doc.id, ...doc.data() } as LogEntry;
        // 위치 정보가 있는 로그만 수집
        if (logData.lat && logData.lng) {
          data.push(logData);
        }
      });
      setLogs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 필터링된 로그
  const filteredLogs = useMemo(() => {
    return intentFilter
      ? logs.filter((log) => log.intent === intentFilter)
      : logs;
  }, [logs, intentFilter]);

  // Heatmap 데이터 포인트 생성
  const heatPoints = useMemo(() => {
    return filteredLogs.map((log) =>
      new google.maps.LatLng(log.lat!, log.lng!)
    );
  }, [filteredLogs]);

  // 통계 계산
  const stats = useMemo(() => {
    const totalLogs = logs.length;
    const todayLogs = logs.filter(log => {
      if (!log.ts?.seconds) return false;
      return dayjs(log.ts.seconds * 1000).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
    });

    const intentCounts = logs.reduce((acc, log) => {
      const intent = log.intent || "미확인";
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIntent = Object.entries(intentCounts)
      .sort(([, a], [, b]) => b - a)[0];

    const keywordCounts = logs.reduce((acc, log) => {
      if (log.keyword) {
        acc[log.keyword] = (acc[log.keyword] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topKeyword = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      totalLogs,
      todayLogs: todayLogs.length,
      topIntent: topIntent ? topIntent[0] : "없음",
      topIntentCount: topIntent ? topIntent[1] : 0,
      topKeyword: topKeyword ? topKeyword[0] : "없음",
      topKeywordCount: topKeyword ? topKeyword[1] : 0,
      intentCounts,
      keywordCounts
    };
  }, [logs]);

  // 사용 가능한 Intent 목록
  const availableIntents = useMemo(() => {
    const intents = Object.keys(stats.intentCounts);
    return ["전체", ...intents];
  }, [stats.intentCounts]);

  if (loadError) {
    return (
      <YagoLayout title="Geo Analytics Dashboard">
        <div className="text-center py-8">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">Google Maps 로딩 실패</h2>
          <p className="text-gray-600">Google Maps API 키를 확인해주세요.</p>
        </div>
      </YagoLayout>
    );
  }

  return (
    <YagoLayout title="AI Geo Analytics Dashboard">
      <div className="space-y-6">
        {/* 📊 헤더 섹션 */}
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-yago-purple mb-2">
            📍 AI Geo Analytics Dashboard
          </h1>
          <p className="text-lg text-yago-gray">
            음성 명령의 위치 기반 패턴 분석 및 Heatmap 시각화
          </p>
        </div>

        {/* 📈 통계 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <YagoStatCard
            title="총 위치 로그"
            value={stats.totalLogs.toLocaleString()}
            change={`+${stats.todayLogs} 오늘`}
            trend="up"
            icon="📍"
          />
          <YagoStatCard
            title="오늘 위치 로그"
            value={stats.todayLogs}
            change="실시간 업데이트"
            trend="up"
            icon="📅"
          />
          <YagoStatCard
            title="인기 의도"
            value={stats.topIntent}
            change={`${stats.topIntentCount}회`}
            trend="neutral"
            icon="🎯"
          />
          <YagoStatCard
            title="인기 키워드"
            value={stats.topKeyword}
            change={`${stats.topKeywordCount}회`}
            trend="neutral"
            icon="🔥"
          />
        </div>

        {/* 🎮 Intent 필터 */}
        <YagoCard title="🎮 Intent 필터" icon="⚙️">
          <div className="flex flex-wrap gap-3">
            {availableIntents.map((intent) => (
              <YagoButton
                key={intent}
                text={intent}
                onClick={() => setIntentFilter(intent === "전체" ? null : intent)}
                variant={intentFilter === intent ? "accent" : "outline"}
                size="sm"
              />
            ))}
          </div>
          <div className="mt-4 text-sm text-yago-gray">
            현재 필터: <strong className="text-yago-purple">
              {intentFilter || "전체"}
            </strong> ({filteredLogs.length}개 위치)
          </div>
        </YagoCard>

        {/* 🗺️ Google Maps Heatmap */}
        <YagoCard title="🗺️ 위치 Heatmap" icon="🔥">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yago-purple"></div>
            </div>
          ) : !isLoaded ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-yago-gray">Google Maps 로딩 중...</div>
            </div>
          ) : (
            <div className="w-full h-[70vh] rounded-xl overflow-hidden shadow-lg">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={defaultZoom}
                options={{
                  mapTypeControl: true,
                  streetViewControl: true,
                  fullscreenControl: true,
                  zoomControl: true,
                }}
              >
                <HeatmapLayer
                  data={heatPoints}
                  options={{
                    radius: 40,
                    opacity: 0.7,
                    gradient: [
                      "rgba(99, 102, 241, 0)",
                      "rgba(99, 102, 241, 0.3)",
                      "rgba(167, 139, 250, 0.6)",
                      "rgba(236, 72, 153, 0.8)",
                      "rgba(236, 72, 153, 1)",
                    ],
                  }}
                />
              </GoogleMap>
            </div>
          )}
        </YagoCard>

        {/* 📊 상세 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Intent별 통계 */}
          <YagoCard title="📊 Intent별 위치 분포" icon="🎯">
            <div className="space-y-3">
              {Object.entries(stats.intentCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([intent, count]) => (
                  <div key={intent} className="flex items-center justify-between p-3 bg-yago-soft rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-yago-purple text-white text-xs font-semibold rounded-full">
                        {intent}
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-yago-purple text-white text-sm font-semibold rounded-full">
                      {count}회
                    </span>
                  </div>
                ))}
            </div>
          </YagoCard>

          {/* 키워드별 통계 */}
          <YagoCard title="🔥 키워드별 위치 분포" icon="🔥">
            <div className="space-y-3">
              {Object.entries(stats.keywordCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([keyword, count]) => (
                  <div key={keyword} className="flex items-center justify-between p-3 bg-yago-soft rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-yago-pink text-white text-xs font-semibold rounded-full">
                        {keyword}
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-yago-pink text-white text-sm font-semibold rounded-full">
                      {count}회
                    </span>
                  </div>
                ))}
            </div>
          </YagoCard>
        </div>

        {/* 📋 최근 위치 로그 */}
        <YagoCard title="📋 최근 위치 로그" icon="📍">
          <div className="max-h-64 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-yago-gray py-8">
                <div className="text-4xl mb-2">📍</div>
                <p>위치 정보가 있는 로그가 없습니다.</p>
                <p className="text-sm">음성 명령을 사용하면 여기에 표시됩니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.slice(0, 20).map((log, i) => (
                  <div key={log.id || i} className="flex items-center justify-between p-3 bg-yago-soft rounded-lg hover:bg-yago-purple/10 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {log.text || "명령 내용 없음"}
                      </p>
                      <p className="text-xs text-yago-gray">
                        {log.ts?.seconds ? dayjs(log.ts.seconds * 1000).format('MM-DD HH:mm:ss') : "시간 없음"} •
                        위치: {log.lat?.toFixed(4)}, {log.lng?.toFixed(4)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.keyword && (
                        <span className="px-2 py-1 bg-yago-pink/10 text-yago-pink text-xs rounded-full">
                          {log.keyword}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-yago-purple/10 text-yago-purple text-xs rounded-full">
                        {log.intent || "미확인"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </YagoCard>

        {/* 🚀 빠른 링크 */}
        <YagoCard title="🚀 빠른 링크" icon="🔗" gradient>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/admin"
              className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium">관리자 대시보드</div>
            </a>
            <a
              href="/voice-map"
              className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
            >
              <div className="text-2xl mb-2">🗺️</div>
              <div className="text-sm font-medium">음성 지도</div>
            </a>
            <a
              href="/voice-map-dashboard"
              className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="text-sm font-medium">로그 대시보드</div>
            </a>
            <a
              href="#"
              className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <div className="text-sm font-medium">설정</div>
            </a>
          </div>
        </YagoCard>
      </div>
    </YagoLayout>
  );
}
