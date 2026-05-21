/**
 * 🔥 KPI 대시보드 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 실시간 KPI 모니터링
 * - 목표 대비 성과 표시
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface KPIData {
  conversion: {
    registrationToTrade: number;
    imageInclusion: number;
    aiTitleAdoption: number;
  };
  retention: {
    dauMau: number;
    weeklyReturn: number;
    noShow: number;
  };
  revenue: {
    arpu: number;
    adCTR: number;
    monthlyRevenue: number;
  };
  updatedAt: any;
}

export default function KPIDashboard() {
  const [kpis, setKPIs] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "kpi_dashboard", "current"),
      (snapshot) => {
        if (snapshot.exists()) {
          setKPIs(snapshot.data() as KPIData);
        }
        setLoading(false);
      },
      (error) => {
        console.error("❌ [KPIDashboard] KPI 조회 실패:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        KPI 데이터 로딩 중...
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="p-6 text-center text-gray-500">
        KPI 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">KPI 대시보드</h1>
        {kpis.updatedAt && (
          <p className="text-sm text-gray-500">
            최종 업데이트: {kpis.updatedAt.toDate().toLocaleString()}
          </p>
        )}
      </div>

      {/* 전환율 지표 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">전환율 지표</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            label="등록→거래 전환율"
            value={kpis.conversion.registrationToTrade}
            target={36}
            unit="%"
            higherIsBetter
          />
          <KPICard
            label="이미지 포함률"
            value={kpis.conversion.imageInclusion}
            target={98}
            unit="%"
            higherIsBetter
          />
          <KPICard
            label="AI 제목 채택률"
            value={kpis.conversion.aiTitleAdoption}
            target={75}
            unit="%"
            higherIsBetter
          />
        </div>
      </section>

      {/* 리텐션 지표 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">리텐션 지표</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            label="DAU/MAU"
            value={kpis.retention.dauMau}
            target={40}
            unit="%"
            higherIsBetter
          />
          <KPICard
            label="주간 재방문율"
            value={kpis.retention.weeklyReturn}
            target={3.5}
            unit="회"
            higherIsBetter
          />
          <KPICard
            label="노쇼율"
            value={kpis.retention.noShow}
            target={4}
            unit="%"
            higherIsBetter={false}
          />
        </div>
      </section>

      {/* 수익화 지표 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">수익화 지표</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            label="ARPU"
            value={kpis.revenue.arpu}
            target={2000}
            unit="원"
            higherIsBetter
          />
          <KPICard
            label="광고 CTR"
            value={kpis.revenue.adCTR}
            target={2.5}
            unit="%"
            higherIsBetter
          />
          <KPICard
            label="월 매출"
            value={kpis.revenue.monthlyRevenue / 100000000}
            target={2.3}
            unit="억원"
            higherIsBetter
          />
        </div>
      </section>
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  higherIsBetter: boolean;
}

function KPICard({ label, value, target, unit, higherIsBetter }: KPICardProps) {
  const isGood = higherIsBetter ? value >= target : value <= target;
  const diff = higherIsBetter ? value - target : target - value;
  const diffPercent = target > 0 ? ((diff / target) * 100).toFixed(1) : "0";

  return (
    <div
      className={`p-4 rounded-lg shadow ${
        isGood
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200"
      }`}
    >
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <p
        className={`text-2xl font-bold mb-1 ${
          isGood ? "text-green-600" : "text-red-600"
        }`}
      >
        {value.toLocaleString()}
        {unit}
      </p>
      <p className="text-xs text-gray-500">
        목표: {target.toLocaleString()}
        {unit}
        {!isGood && (
          <span className="ml-2 text-red-600">
            ({diffPercent > 0 ? "+" : ""}
            {diffPercent}% 차이)
          </span>
        )}
      </p>
    </div>
  );
}
