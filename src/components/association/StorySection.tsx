/**
 * 협회 페이지 스토리 섹션
 * 
 * 노출 조건:
 * - associationId 일치
 * - verified === true
 * 
 * 협회는 아무것도 안 함
 * 기록이 자동으로 쌓임
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Story } from "@/types/story";
import { StoryCard } from "@/components/story/StoryCard";

interface StorySectionProps {
  associationId: string;
}

export function StorySection({ associationId }: StorySectionProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId) return;

    const fetchStories = async () => {
      try {
        const storiesRef = collection(db, "stories");
        const q = query(
          storiesRef,
          where("associationId", "==", associationId),
          where("verified", "==", true),
          orderBy("createdAt", "desc"),
          limit(6) // 최신 6개만 표시
        );
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
  }, [associationId]);

  if (loading) {
    return (
      <section id="stories" className="py-12 border-b bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-2xl font-bold mb-4">활동 기록</h2>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </section>
    );
  }

  if (stories.length === 0) {
    return null; // 기록이 없으면 섹션 숨김
  }

  return (
    <section id="stories" className="py-12 border-b bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">활동 기록</h2>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
            공식 기록
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700">
            본 기록은 공식 대회·행정·공공 활동을 기반으로 AI 검증을 거쳐 자동 생성되었습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} showPersonName={true} />
          ))}
        </div>
      </div>
    </section>
  );
}

