/**
 * 📊 QR 로그인 통계 대시보드
 * 
 * 관리자용 QR 로그인 성과 분석 페이지
 */

import { useState, useEffect } from "react";
import { getQRLoginStats, subscribeToQREvents, type QRLoginStats } from "@/lib/qrLoginStats";
import { useAuth } from "@/context/AuthProvider";

export default function QRLoginDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<QRLoginStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);

  // 🔥 통계 로드
  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        setError(null);
        const data = await getQRLoginStats(daysBack);
        setStats(data);
      } catch (err: any) {
        console.error("❌ [QRLoginDashboard] 통계 로드 실패:", err);
        setError(err.message || "통계를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [daysBack]);

  // 🔥 실시간 이벤트 구독 (최근 1일)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    subscribeToQREvents((event) => {
      setRealtimeEvents((prev) => [event, ...prev.slice(0, 49)]); // 최근 50개만 유지
    }, 1).then((unsub) => {
      unsubscribe = unsub;
    }).catch(console.error);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // 🔥 권한 체크 (관리자만)
  if (!user || user.isAnonymous) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div>관리자 권한이 필요합니다.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div>통계를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ color: "#ef4444" }}>오류: {error}</div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
        📊 QR 로그인 통계 대시보드
      </h1>
      
      <div style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>
          기간 선택:
        </label>
        <select
          value={daysBack}
          onChange={(e) => setDaysBack(Number(e.target.value))}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          <option value={7}>최근 7일</option>
          <option value={30}>최근 30일</option>
          <option value={90}>최근 90일</option>
        </select>
      </div>

      {/* 핵심 지표 카드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16,
        marginBottom: 32,
      }}>
        <StatCard
          title="전체 세션"
          value={stats.totalSessions.toLocaleString()}
          color="#2563eb"
        />
        <StatCard
          title="성공 로그인"
          value={stats.successfulLogins.toLocaleString()}
          color="#10b981"
        />
        <StatCard
          title="성공률"
          value={`${stats.successRate.toFixed(1)}%`}
          color={stats.successRate >= 80 ? "#10b981" : stats.successRate >= 60 ? "#f59e0b" : "#ef4444"}
        />
        <StatCard
          title="평균 소요 시간"
          value={`${stats.avgTimeToLogin}초`}
          color="#6366f1"
        />
      </div>

      {/* 상세 통계 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 24,
        marginBottom: 32,
      }}>
        {/* 실패 원인 분석 */}
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            실패 원인 분석
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <StatRow
              label="SMS 인증 실패"
              value={stats.failureReasons.smsFailed}
              total={stats.failedLogins}
            />
            <StatRow
              label="로그인 실패"
              value={stats.failureReasons.loginFailed}
              total={stats.failedLogins}
            />
            <StatRow
              label="세션 만료"
              value={stats.failureReasons.sessionExpired}
              total={stats.failedLogins}
            />
            <StatRow
              label="기타"
              value={stats.failureReasons.other}
              total={stats.failedLogins}
            />
          </div>
        </div>

        {/* 플랫폼별 통계 */}
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            플랫폼별 통계
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#666" }}>
                💻 데스크톱
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                {stats.platformStats.desktop.successes} / {stats.platformStats.desktop.sessions}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                성공률: {stats.platformStats.desktop.sessions > 0
                  ? ((stats.platformStats.desktop.successes / stats.platformStats.desktop.sessions) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#666" }}>
                📱 모바일
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                {stats.platformStats.mobile.successes} / {stats.platformStats.mobile.sessions}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                성공률: {stats.platformStats.mobile.sessions > 0
                  ? ((stats.platformStats.mobile.successes / stats.platformStats.mobile.sessions) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* 최근 통계 */}
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            최근 통계
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#666" }}>
                최근 7일
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
                {stats.recentStats.last7Days.successes} / {stats.recentStats.last7Days.sessions}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                성공률: {stats.recentStats.last7Days.successRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#666" }}>
                최근 30일
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
                {stats.recentStats.last30Days.successes} / {stats.recentStats.last30Days.sessions}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                성공률: {stats.recentStats.last30Days.successRate.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 시간 통계 */}
      <div style={{
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        marginBottom: 32,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          로그인 소요 시간
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>평균</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{stats.avgTimeToLogin}초</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>최소</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{stats.minTimeToLogin}초</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>최대</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{stats.maxTimeToLogin}초</div>
          </div>
        </div>
      </div>

      {/* 실시간 이벤트 (최근 10개) */}
      {realtimeEvents.length > 0 && (
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            실시간 이벤트 (최근 10개)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {realtimeEvents.slice(0, 10).map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                style={{
                  padding: 12,
                  background: "#f9fafb",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {event.event}
                </div>
                <div style={{ color: "#666", fontSize: 11 }}>
                  {event.sessionId && `세션: ${event.sessionId.substring(0, 8)}...`}
                  {event.platform && ` | 플랫폼: ${event.platform}`}
                  {event.createdAt && ` | ${new Date(event.createdAt.toMillis?.() || event.createdAt.seconds * 1000).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: 24,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 32, fontWeight: 600, color }}>
        {value}
      </div>
    </div>
  );
}

function StatRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {value} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div style={{
        height: 8,
        background: "#e5e7eb",
        borderRadius: 4,
        overflow: "hidden",
      }}>
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            background: "#ef4444",
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}
