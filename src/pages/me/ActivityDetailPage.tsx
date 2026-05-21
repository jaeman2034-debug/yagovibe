/**
 * 🔥 ActivityDetailPage - 활동 기록 상세 페이지
 * 
 * 역할:
 * - 단일 활동 기록의 상세 정보 표시
 * - 기본 정보, 활동 정보, 통계, 액션 버튼 제공
 * 
 * UX 목적:
 * - 기록 이해 및 관리
 * - 허브 = 동기, 마이페이지 = 관리, 상세페이지 = 기록 이해
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "@/lib/firebase";
import { ActivityAnalysisCard } from "@/components/me/ActivityAnalysisCard";
import { ActivityInsightCard } from "@/components/me/ActivityInsightCard";
import { getSportLabel } from "@/constants/sports";
import { deleteActivity } from "@/services/activityService";

/**
 * 🔥 ActivityDetailPage 컴포넌트
 */
export default function ActivityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const ref = doc(db, "activityHistory", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setData(snap.data());
        }
      } catch (err) {
        console.error("❌ [ActivityDetailPage] 기록 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  /**
   * 🔥 삭제 핸들러
   */
  const handleDelete = async () => {
    if (!id) return;

    const ok = confirm("기록을 삭제하시겠습니까?");
    if (!ok) return;

    setDeleting(true);

    try {
      await deleteActivity(id);
      alert("삭제 완료");
      navigate("/me"); // 마이페이지로 이동
    } catch (e: any) {
      console.error("❌ [ActivityDetailPage] 삭제 실패:", e);
      alert("삭제 실패");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩중...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">기록을 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  const durationMin = Math.floor((data.durationMs || 0) / 60000);
  
  // 🔥 날짜 포맷팅
  let dateStr = "";
  if (data.endedAt) {
    let endDate: Date | null = null;
    if (data.endedAt.toDate && typeof data.endedAt.toDate === "function") {
      endDate = data.endedAt.toDate();
    } else if (data.endedAt.seconds) {
      endDate = new Date(data.endedAt.seconds * 1000);
    } else if (data.endedAt instanceof Date) {
      endDate = data.endedAt;
    }
    if (endDate) {
      dateStr = endDate.toLocaleString("ko-KR");
    }
  }

  const sportLabel = getSportLabel(data.sport || "");

  return (
    <div className="p-6 space-y-4 w-full max-w-none px-3 md:mx-auto md:max-w-3xl">
      {/* 뒤로가기 */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
      >
        ← 뒤로가기
      </button>

      {/* 1️⃣ 기본 정보 카드 */}
      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <h2 className="text-xl font-bold text-neutral-800">활동 상세</h2>

        <div className="space-y-2 text-sm">
          {dateStr && (
            <div className="text-gray-600">
              <span className="font-medium">날짜:</span> {dateStr}
            </div>
          )}

          <div className="text-neutral-800">
            <span className="font-medium">종목:</span> {sportLabel || data.sport || "미정"}
          </div>

          <div className="text-neutral-800">
            <span className="font-medium">운동 시간:</span> {durationMin}분
          </div>

          {data.location?.dong && (
            <div className="text-neutral-800">
              <span className="font-medium">장소:</span>{" "}
              {data.location.dong}
              {data.location.gu && ` · ${data.location.gu}`}
              {data.location.si && ` · ${data.location.si}`}
            </div>
          )}
        </div>
      </div>

      {/* 2️⃣ 활동 분석 카드 */}
      {data.startedAt && data.endedAt && (
        <ActivityAnalysisCard
          startedAt={data.startedAt}
          endedAt={data.endedAt}
          durationMs={data.durationMs || 0}
          location={data.location || { dong: "" }}
          status={data.status || "ended"}
        />
      )}

      {/* 3️⃣ 개인 통계 카드 */}
      {data.endedAt && (
        <ActivityInsightCard
          currentDurationMs={data.durationMs || 0}
          endedAt={data.endedAt}
        />
      )}

      {/* 액션 버튼 */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <h3 className="font-semibold mb-4 text-sm text-neutral-700">액션</h3>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-4 w-full rounded-lg bg-red-100 text-red-500 py-3 font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  );
}
