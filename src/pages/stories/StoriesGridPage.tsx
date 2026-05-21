/**
 * 스토리 그리드 페이지 (탐색용)
 * /stories
 * 
 * 원칙:
 * - 카드 그리드
 * - 필터: 협회 / 대회 / 역할
 * - "사람 중심"으로 보이지만 실제는 협회 운영 이력 지도
 */

import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Story, StoryType } from "@/types/story";
import { StoryCard } from "@/components/story/StoryCard";
import { NoticeOfficialFooter } from "@/components/association/NoticeOfficialFooter";

export default function StoriesGridPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAssociation, setFilterAssociation] = useState<string>("");
  const [filterType, setFilterType] = useState<StoryType | "">("");

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const storiesRef = collection(db, "stories");
        const constraints: any[] = [where("verified", "==", true)];

        if (filterAssociation) {
          constraints.push(where("associationId", "==", filterAssociation));
        }

        if (filterType) {
          constraints.push(where("type", "==", filterType));
        }

        const q = query(storiesRef, ...constraints, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const storiesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Story[];

        setStories(storiesData);
      } catch (error) {
        console.error("스토리 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [filterAssociation, filterType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">활동 기록</h1>
          <p className="text-sm text-gray-600 mt-2">
            공식 대회·행정·공공 활동을 기반으로 자동 생성되었습니다.
          </p>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                협회
              </label>
              <input
                type="text"
                value={filterAssociation}
                onChange={(e) => setFilterAssociation(e.target.value)}
                placeholder="협회 ID로 필터"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                활동 유형
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as StoryType | "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">전체</option>
                <option value="tournament_participation">대회 참가</option>
                <option value="official_role">공식 역할</option>
                <option value="public_contribution">공공 기여</option>
                <option value="club_operation">클럽 운영</option>
                <option value="roster_submission">선수 명단</option>
              </select>
            </div>
          </div>
        </div>

        {/* 스토리 그리드 */}
        {stories.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-2">
              공식 기록으로 생성된 스토리가 아직 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} showPersonName={true} />
            ))}
          </div>
        )}

        {/* 하단 고정 문구 */}
        <NoticeOfficialFooter />
      </div>
    </div>
  );
}

