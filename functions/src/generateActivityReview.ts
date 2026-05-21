// functions/src/generateActivityReview.ts
// 🔥 활동 후기 자동 생성 (일정 완료 시 트리거)

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import OpenAI from "openai";

// Initialize Firebase Admin only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

interface ActivityData {
  date: string;
  title: string;
  location?: string;
  attendanceCount?: number;
  totalMembers?: number;
  photos?: string[];
  weather?: string;
  description?: string;
}

/**
 * 일정 완료 시 활동 후기 자동 생성 (Event-driven)
 */
export const onScheduleCompleted = onDocumentWritten(
  {
    document: "teams/{teamId}/schedules/{scheduleId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const db = getFirestore();
    const { teamId, scheduleId } = event.params;
    const afterData = event.data?.after?.data();
    const beforeData = event.data?.before?.data();

    // 상태가 "completed"로 변경된 경우만 처리
    if (afterData?.status !== "completed" || beforeData?.status === "completed") {
      return;
    }

    logger.info(`📝 [onScheduleCompleted] 팀 ${teamId} 일정 ${scheduleId} 완료 → 활동 후기 생성 시작`);

    try {
      // 1️⃣ 팀 정보 조회
      const teamDoc = await db.doc(`teams/${teamId}`).get();
      if (!teamDoc.exists) {
        logger.warn(`⚠️ [onScheduleCompleted] 팀 ${teamId}를 찾을 수 없음`);
        return;
      }
      const teamData = teamDoc.data();

      // 2️⃣ 블로그 설정 확인
      const blogSettingsRef = db.doc(`teams/${teamId}/blog/settings`);
      const blogSettingsSnap = await blogSettingsRef.get();
      
      if (!blogSettingsSnap.exists) {
        logger.info(`ℹ️ [onScheduleCompleted] 팀 ${teamId} 블로그 미활성화, 후기 생성 스킵`);
        return;
      }

      const blogSettings = blogSettingsSnap.data() as { enabled: boolean; plan: "free" | "pro" };
      if (!blogSettings.enabled) {
        return;
      }

      // 3️⃣ 무료 플랜 제한 체크 (월 2회)
      if (blogSettings.plan === "free") {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const postsRef = db.collection(`teams/${teamId}/blog_posts`);
        const monthlyPosts = await postsRef
          .where("postType", "==", "activity_review")
          .where("status", "==", "published")
          .get();

        // 이번 달 활동 후기 개수 확인
        const thisMonthPosts = monthlyPosts.docs.filter((doc) => {
          const publishedAt = doc.data().publishedAt;
          if (!publishedAt) return false;
          const postMonth = publishedAt.toDate().toISOString().slice(0, 7);
          return postMonth === currentMonth;
        });

        if (thisMonthPosts.length >= 2) {
          logger.info(`ℹ️ [onScheduleCompleted] 팀 ${teamId} 무료 플랜 월 2회 제한 도달, 후기 생성 스킵`);
          return;
        }
      }

      // 4️⃣ 출석 데이터 수집
      const scheduleDate = afterData.date || afterData.startDate || new Date().toISOString().split("T")[0];
      const attendanceRef = db.collection(`teams/${teamId}/attendance`);
      const attendanceQuery = await attendanceRef
        .where("date", "==", scheduleDate)
        .limit(1)
        .get();

      let attendanceCount = 0;
      if (!attendanceQuery.empty) {
        const attendanceData = attendanceQuery.docs[0].data();
        attendanceCount = attendanceData.items?.length || attendanceData.members?.length || 0;
      }

      // 5️⃣ 멤버 수 조회
      const membersRef = db.collection(`teams/${teamId}/members`);
      const membersSnap = await membersRef.where("isDeleted", "!=", true).get();
      const totalMembers = membersSnap.size;

      // 6️⃣ 활동 데이터 구성
      const activityData: ActivityData = {
        date: scheduleDate,
        title: afterData.title || afterData.event || "정기 활동",
        location: afterData.location || teamData.location || "",
        attendanceCount,
        totalMembers,
        photos: afterData.photos || [],
        weather: afterData.weather || "",
        description: afterData.description || "",
      };

      // 7️⃣ AI로 활동 후기 생성
      const post = await generateActivityReviewContent(teamId, teamData, activityData, blogSettings.plan);

      // 8️⃣ Firestore에 저장
      const postRef = db.collection(`teams/${teamId}/blog_posts`).doc();
      await postRef.set({
        ...post,
        status: "published",
        createdAt: FieldValue.serverTimestamp(),
        createdBy: "ai",
        postType: "activity_review",
        publishedAt: FieldValue.serverTimestamp(),
        viewCount: 0,
        plan: blogSettings.plan,
        relatedScheduleId: scheduleId, // 원본 일정 ID 연결
      });

      logger.info(`✅ [onScheduleCompleted] 팀 ${teamId} 활동 후기 생성 완료: ${postRef.id}`);
    } catch (error) {
      logger.error(`❌ [onScheduleCompleted] 활동 후기 생성 실패:`, error);
    }
  }
);

/**
 * AI로 활동 후기 콘텐츠 생성
 */
async function generateActivityReviewContent(
  teamId: string,
  teamData: any,
  activityData: ActivityData,
  plan: "free" | "pro"
): Promise<{ title: string; content: string; excerpt: string; seoMeta: { title?: string; description?: string; keywords?: string[] } }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 활동 정보 텍스트 구성
  const activityInfo = `
활동 정보:
- 날짜: ${activityData.date}
- 제목: ${activityData.title}
${activityData.location ? `- 장소: ${activityData.location}` : ""}
${activityData.weather ? `- 날씨: ${activityData.weather}` : ""}
- 참여 인원: ${activityData.attendanceCount}명 / 전체 ${activityData.totalMembers}명
${activityData.description ? `- 설명: ${activityData.description}` : ""}
${activityData.photos && activityData.photos.length > 0 ? `- 사진: ${activityData.photos.length}장` : ""}
  `.trim();

  const prompt = buildActivityReviewPrompt(teamData, activityInfo, plan);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 스포츠 팀 활동 후기 전문 작가입니다. 생동감 있고 긍정적인 톤으로 활동의 즐거움을 전달합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";
    const parsed = parseAIResponse(aiResponse);

    // SEO 최적화 (Pro 플랜만)
    const seoMeta = plan === "pro" 
      ? await optimizeActivitySEO(parsed.title, parsed.content, teamData, activityData, openai)
      : {
          title: parsed.title,
          description: parsed.excerpt,
          keywords: [],
        };

    // 첫 글과 동일하게 메타 정보 추가
    const enhancedContent = enhanceActivityReviewContent(parsed.content, plan, activityData);

    return {
      title: parsed.title,
      content: enhancedContent,
      excerpt: parsed.excerpt,
      seoMeta,
    };
  } catch (error) {
    logger.error("❌ [generateActivityReviewContent] OpenAI API 호출 실패:", error);
    throw new Error("활동 후기 생성에 실패했습니다.");
  }
}

/**
 * 활동 후기 프롬프트 생성
 */
function buildActivityReviewPrompt(
  teamData: any,
  activityInfo: string,
  plan: "free" | "pro"
): string {
  const teamName = teamData.name || "우리 팀";
  const sportType = teamData.sportType || "스포츠";
  const location = teamData.location || "";

  return `다음 정보를 바탕으로 "${teamName}" 팀의 활동 후기 블로그 글을 작성해주세요.

팀 정보:
- 팀명: ${teamName}
- 종목: ${sportType}
${location ? `- 활동 지역: ${location}` : ""}

${activityInfo}

요구사항:
1. 제목: "오늘도 함께 땀 흘린 [팀명] ⚽" 또는 "[지역]에서 열린 이번 주 [종목] 모임 후기" 형식의 매력적인 제목
2. 본문: HTML 형식으로 작성 (h2, p, ul, li, strong, em 태그 사용)
3. 요약: 2-3줄 요약 (excerpt)
4. 톤: 친근하고 긍정적이며, 활동의 생동감을 전달하는 톤
5. 내용 구조:
   - 활동 개요 (날짜, 장소, 날씨)
   - 참여 인원 및 출석률
   - 활동 내용 (워밍업, 게임, 특별 이벤트 등)
   - 활동 소감 및 팀 분위기
   - 다음 활동 안내 또는 가입 안내

핵심 포인트:
- "꾸준함과 즐거움"을 강조하는 메시지
- 외부 방문자에게 "활동하는 팀"임을 전달
- 자연스러운 가입 유도
- SEO를 고려한 자연스러운 키워드 포함 (지역명, 연령대, 종목명)

응답 형식:
TITLE: [제목]
EXCERPT: [요약]
CONTENT: [HTML 본문]`;
}

/**
 * 활동 후기 콘텐츠 강화 (메타 정보 + CTA 추가)
 */
function enhanceActivityReviewContent(
  content: string,
  plan: "free" | "pro",
  activityData: ActivityData
): string {
  // AI 자동 생성 배지
  const aiBadge = `
    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-800 mb-2">
        <strong>🧠 AI 자동 후기</strong> | <span class="text-xs">📅 ${activityData.date} 활동</span>
      </p>
      ${plan === "free" ? `
        <p class="text-xs text-blue-700 mt-2">
          💡 이 후기는 AI가 자동으로 생성했습니다. 
          <strong>Pro 플랜</strong>에서는 사진 기반 설명, 예약 발행, SNS 공유용 요약을 제공합니다.
        </p>
      ` : `
        <p class="text-xs text-blue-700 mt-2">
          ✨ Pro 플랜으로 AI가 자동으로 관리하는 활동 후기입니다.
        </p>
      `}
    </div>
  `;

  // CTA 버튼 영역
  const ctaSection = `
    <div class="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg text-center">
      <p class="text-lg font-semibold text-gray-900 mb-4">함께하시겠어요?</p>
      <p class="text-sm text-gray-600 mb-4">
        ${plan === "pro" ? "이 팀의 블로그는 AI가 자동으로 관리하고 있습니다." : "이 팀 페이지는 AI가 관리합니다."}
      </p>
      <div class="flex justify-center gap-3">
        <button class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          이 팀에 가입하기
        </button>
      </div>
    </div>
  `;

  return content + aiBadge + ctaSection;
}

/**
 * AI 응답 파싱
 */
function parseAIResponse(response: string): { title: string; content: string; excerpt: string } {
  const titleMatch = response.match(/TITLE:\s*(.+)/i);
  const excerptMatch = response.match(/EXCERPT:\s*(.+)/i);
  const contentMatch = response.match(/CONTENT:\s*([\s\S]+)/i);

  return {
    title: titleMatch?.[1]?.trim() || "활동 후기",
    excerpt: excerptMatch?.[1]?.trim() || "",
    content: contentMatch?.[1]?.trim() || "<p>활동 후기를 생성하는 중입니다.</p>",
  };
}

/**
 * 활동 후기 SEO 최적화 (Pro 전용)
 */
async function optimizeActivitySEO(
  title: string,
  content: string,
  teamData: any,
  activityData: ActivityData,
  openai: OpenAI
): Promise<{ title?: string; description?: string; keywords?: string[] }> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 SEO 전문가입니다. 활동 후기 블로그 포스트의 SEO 메타데이터를 최적화합니다.",
        },
        {
          role: "user",
          content: `다음 활동 후기 블로그 포스트의 SEO 메타데이터를 생성해주세요.

제목: ${title}
팀명: ${teamData.name}
종목: ${teamData.sportType}
지역: ${activityData.location || teamData.location}
날짜: ${activityData.date}

요구사항:
1. SEO 최적화된 제목 (60자 이내)
2. 메타 설명 (160자 이내)
3. 키워드 5-10개 (배열)

응답 형식:
SEO_TITLE: [제목]
SEO_DESCRIPTION: [설명]
SEO_KEYWORDS: [키워드1, 키워드2, ...]`,
        },
      ],
      temperature: 0.5,
    });

    const aiResponse = completion.choices[0]?.message?.content || "";
    const titleMatch = aiResponse.match(/SEO_TITLE:\s*(.+)/i);
    const descMatch = aiResponse.match(/SEO_DESCRIPTION:\s*(.+)/i);
    const keywordsMatch = aiResponse.match(/SEO_KEYWORDS:\s*(.+)/i);

    return {
      title: titleMatch?.[1]?.trim(),
      description: descMatch?.[1]?.trim(),
      keywords: keywordsMatch?.[1]?.split(",").map((k) => k.trim()),
    };
  } catch (error) {
    logger.warn("⚠️ [optimizeActivitySEO] SEO 최적화 실패, 기본값 사용:", error);
    return {
      title,
      description: content.substring(0, 160),
      keywords: [],
    };
  }
}

