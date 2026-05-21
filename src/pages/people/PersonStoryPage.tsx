/**
 * 개인 스토리 페이지 (공식 이력)
 * /people/:personId
 * 
 * 원칙:
 * - 스토리 카드 타임라인
 * - 최신 활동 상단
 * - 배지: ✔ AI 검증 완료
 * - ❌ 글쓰기 버튼
 * - ❌ 수정 버튼
 * - ❌ 댓글
 */

import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Story } from "@/types/story";
import { StoryCard } from "@/components/story/StoryCard";
import { NoticeOfficialFooter } from "@/components/association/NoticeOfficialFooter";

export default function PersonStoryPage() {
  const { personId } = useParams<{ personId: string }>();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [personName, setPersonName] = useState<string>("");

  useEffect(() => {
    if (!personId) return;

    const fetchStories = async () => {
      try {
        // verified === true만 조회
        const storiesRef = collection(db, "stories");
        const q = query(
          storiesRef,
          where("personId", "==", personId),
          where("verified", "==", true),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        const storiesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Story[];

        setStories(storiesData);
        if (storiesData.length > 0) {
          setPersonName(storiesData[0].personName);
        }
      } catch (error) {
        console.error("스토리 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [personId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {personName || "축구인"} 활동 기록
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            공식 대회·행정·공공 활동을 기반으로 자동 생성되었습니다.
          </p>
        </div>

        {/* 공식 기준 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700 font-medium">
            본 기록은 공식 대회·행정·공공 활동을 기반으로 AI 검증을 거쳐 자동 생성되었습니다.
          </p>
        </div>

        {/* 스토리 타임라인 */}
        {stories.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-2">
              공식 기록으로 생성된 스토리가 아직 없습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}

        {/* 하단 고정 문구 */}
        <NoticeOfficialFooter />
      </div>
    </div>
  );
}

