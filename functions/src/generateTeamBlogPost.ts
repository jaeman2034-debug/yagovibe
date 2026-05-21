// functions/src/generateTeamBlogPost.ts
// 🔥 팀 블로그 포스트 생성 (Callable + Scheduled)

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { requireAdmin } from "./utils/requireAdmin";
import type OpenAI from "openai";
// 🔥 OpenAI는 함수 내부에서 lazy import (배포 로딩 단계에서 무거운 초기화 방지)

// 🔥 Firebase Admin 초기화는 getFirestore()가 자동으로 처리하지만,
// 명시적으로 초기화하여 Rules 우회 보장 (함수 내부에서 처리)

interface GenerateBlogPostRequest {
  teamId: string;
  postType?: "intro" | "weekly" | "team_atmosphere" | "growth_report" | "schedule_preview" | "memorable_moment" | "recruitment";
  weekStart?: string; // YYYY-MM-DD (weekly용)
}

// 🔥 5단계: 자동 성장 루프 - 주제 풀 정의
type BlogPostTopic = "weekly" | "team_atmosphere" | "growth_report" | "schedule_preview" | "memorable_moment";

const BLOG_TOPIC_POOL: BlogPostTopic[] = [
  "weekly",              // 🏃 최근 활동 요약
  "team_atmosphere",      // 👥 팀 분위기 / 멤버 인터뷰형
  "growth_report",        // 📈 성장/변화 리포트
  "schedule_preview",     // 🗓️ 다음 일정 예고
  "memorable_moment",     // 🏆 기억에 남는 순간 회고
];

interface BlogPost {
  title: string;
  content: string; // HTML
  excerpt: string;
  seoMeta: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  status: "draft" | "published";
  createdAt: Timestamp;
  createdBy: "ai" | string; // "ai" 또는 uid
  postType: string;
  publishedAt?: Timestamp;
  viewCount: number;
  plan: "free" | "pro"; // 생성 시점의 플랜
  teamId?: string; // 🔑 Rules 체크용 필수 필드
}

interface BlogSettings {
  enabled: boolean;
  plan: "free" | "pro";
  teamSlug: string; // URL 친화적 팀명 (예: "소흘-60대-FC")
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 팀 블로그 포스트 생성 (Callable)
 */
export const generateTeamBlogPost = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 120, // 🔥 AI 호출 대비 타임아웃 증가
    memory: "512MiB", // 🔥 메모리 증가
    secrets: ["OPENAI_API_KEY"], // 🔥 Secret Manager에서 OpenAI API 키 가져오기
  },
  async (request) => {
    // 🔥 함수 시작 로그 (최우선)
    logger.info(`🚀 [generateTeamBlogPost] 함수 호출 시작`, {
      hasAuth: !!request.auth,
      uid: request.auth?.uid,
      teamId: request.data?.teamId,
      postType: request.data?.postType,
    });
    
    // 🔥 환경변수 확인 로그 (최종 확인)
    console.log("ENV CHECK >>>", {
      hasKey: !!process.env.OPENAI_API_KEY,
      preview: process.env.OPENAI_API_KEY?.slice(0, 5),
    });
    
    // 🔥 OpenAI API 키 확인 (Functions v2에서는 process.env만 사용)
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    
    logger.info(`🔑 [generateTeamBlogPost] OpenAI API 키 확인:`, {
      hasApiKey,
      keyLength: process.env.OPENAI_API_KEY?.length || 0,
      teamId: request.data?.teamId,
      postType: request.data?.postType,
      uid: request.auth?.uid,
    });

    // 🔥 확인용 로그 (최종 확인)
    console.log("OPENAI KEY EXISTS:", hasApiKey);

    if (!hasApiKey) {
      logger.error("❌ [generateTeamBlogPost] OPENAI_API_KEY가 설정되지 않았습니다.");
      throw new HttpsError(
        "failed-precondition",
        "OpenAI API 키가 설정되지 않았습니다. Firebase Console > Functions > Configuration > Environment variables에서 OPENAI_API_KEY를 설정해주세요."
      );
    }

    // 🔥 Firebase Admin SDK 명시적 초기화 (Rules 우회 보장)
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
    
    const db = getFirestore();
    const { teamId, postType: requestedPostType } = request.data as GenerateBlogPostRequest;
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "인증이 필요합니다.");
    }

    if (!teamId) {
      throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
    }

    // 🔥 권한 체크: 관리자만 생성 가능
    try {
      await requireAdmin(teamId, uid);
      logger.info(`📝 [generateTeamBlogPost] 팀 ${teamId} 블로그 포스트 생성 시작 (권한 확인 완료)`);
    } catch (authError: any) {
      logger.warn(`⚠️ [generateTeamBlogPost] 권한 체크 실패:`, authError);
      // 🔥 HttpsError가 아니면 변환
      if (authError instanceof HttpsError) {
        throw authError;
      }
      throw new HttpsError("permission-denied", "권한이 없습니다.", {
        originalError: authError?.message || String(authError),
      });
    }

    try {
      // 1️⃣ 팀 정보 조회
      const teamDoc = await db.doc(`teams/${teamId}`).get();
      if (!teamDoc.exists) {
        throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
      }
      const teamData = teamDoc.data();

      // 🔥 5-2: postType이 없으면 자동으로 다음 주제 결정
      let postType: string;
      if (requestedPostType) {
        postType = requestedPostType;
      } else {
        // 다음 글 생성 요청 → 자동 주제 결정
        const autoTopic = await decideNextPostTopic(db, teamId);
        postType = autoTopic;
        logger.info(`🎯 [generateTeamBlogPost] 자동 주제 결정: ${autoTopic}`);
      }

      // 🔥 2) 플랜 체크: Pro 플랜만 허용
      const plan = teamData?.plan as "free" | "pro" | undefined;
      if (plan !== "pro") {
        logger.warn(`⚠️ [generateTeamBlogPost] 플랜 체크 실패: ${plan} (Pro 필요)`, { teamId, uid });
        throw new HttpsError(
          "failed-precondition",
          "Pro 플랜이 필요합니다. 업그레이드해주세요."
        );
      }

      // 🔥 3) Rate Limit 체크 (팀당 1분 쿨타임)
      const rateLimitRef = db.doc(`teams/${teamId}/blog/rateLimit`);
      const rateLimitSnap = await rateLimitRef.get();
      const now = Date.now();
      const lastGeneratedAt = rateLimitSnap.data()?.lastGeneratedAt?.toMillis?.() || 0;
      const cooldownMs = 60 * 1000; // 1분

      if (now - lastGeneratedAt < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - lastGeneratedAt)) / 1000);
        logger.warn(`⚠️ [generateTeamBlogPost] Rate limit 초과: ${remainingSeconds}초 대기 필요`, { teamId, uid });
        throw new HttpsError(
          "resource-exhausted",
          `너무 빈번한 요청입니다. ${remainingSeconds}초 후 다시 시도해주세요.`,
          { retryAfter: remainingSeconds }
        );
      }

      // 4️⃣ 블로그 설정 확인 (트랜잭션 전에 미리 확인)
      const blogRef = db.doc(`teams/${teamId}/blog/settings`);
      const blogSnap = await blogRef.get();
      
      let blogSettings: BlogSettings;
      let isNewBlog = false;
      
      if (!blogSnap.exists) {
        // 최초 블로그 생성 (트랜잭션 내부에서 처리)
        isNewBlog = true;
        const teamSlug = generateTeamSlug(teamData.name || `team-${teamId}`);
        blogSettings = {
          enabled: true,
          plan: (teamData.plan as "free" | "pro") || "free",
          teamSlug,
          createdAt: FieldValue.serverTimestamp() as Timestamp,
          updatedAt: FieldValue.serverTimestamp() as Timestamp,
        };
      } else {
        blogSettings = blogSnap.data() as BlogSettings;
      }

      // 5️⃣ 무료 플랜 제한 체크 (이중 안전장치 - Pro 플랜은 이미 위에서 확인했으므로 이 체크는 거의 실행되지 않음)
      if (blogSettings.plan === "free" && postType !== "intro") {
        const postsRef = db.collection(`teams/${teamId}/blog_posts`);
        const existingPosts = await postsRef.where("status", "==", "published").get();
        
        if (existingPosts.size >= 1) {
          throw new HttpsError("failed-precondition", "무료 플랜은 월 2개 글까지만 생성 가능합니다. Pro로 업그레이드하세요.");
        }
      }

      // 4️⃣ AI로 블로그 포스트 생성 (트랜잭션 밖에서 실행)
      // ⚠️ 중요: 트랜잭션 안에서 외부 API 호출 금지
      const post = await generateBlogPostContent(teamId, teamData, postType, blogSettings.plan);

      // AI 생성 실패 시 아무것도 저장하지 않음
      if (!post || !post.title || !post.content) {
        throw new HttpsError("internal", "AI 블로그 포스트 생성에 실패했습니다. 다시 시도해주세요.");
      }

      // 5️⃣ 첫 글인 경우 메타 정보 추가
      const isFirstPost = postType === "intro";
      const enhancedContent = isFirstPost
        ? enhanceFirstPostContent(post.content, blogSettings.plan)
        : post.content;

      // 6️⃣ 트랜잭션으로 원자적 저장
      const postRef = db.collection(`teams/${teamId}/blog_posts`).doc();
      const blogPost: BlogPost = {
        ...post,
        content: enhancedContent,
        status: "published",
        createdAt: FieldValue.serverTimestamp() as Timestamp,
        createdBy: "ai",
        postType,
        publishedAt: FieldValue.serverTimestamp() as Timestamp,
        viewCount: 0,
        plan: blogSettings.plan,
        teamId, // 🔑 Rules 체크용 필수 필드
      };

      // 🔥 저장 payload 로그 (디버깅용)
      logger.info(`📝 [generateTeamBlogPost] 저장 payload:`, {
        teamId,
        title: blogPost.title,
        postType: blogPost.postType,
        hasContent: !!blogPost.content,
        hasTeamId: !!blogPost.teamId,
      });

      // 🔥 원자적 트랜잭션: 블로그 설정 + 포스트 저장
      // ⚠️ 중요: Admin SDK를 사용하므로 Rules를 우회해야 함
      try {
        logger.info(`📝 [generateTeamBlogPost] 트랜잭션 시작:`, {
          teamId,
          postPath: postRef.path,
          blogPath: blogRef.path,
          isNewBlog,
          hasTeamId: !!blogPost.teamId,
        });

        await db.runTransaction(async (transaction) => {
          // 블로그 설정 확인 (트랜잭션 내부에서 재확인)
          const blogSnapInTx = await transaction.get(blogRef);
          
          if (!blogSnapInTx.exists && isNewBlog) {
            // 최초 블로그 생성
            logger.info(`📝 [generateTeamBlogPost] 블로그 설정 생성: ${blogRef.path}`);
            transaction.set(blogRef, blogSettings);
          } else if (blogSnapInTx.exists) {
            // 마지막 포스트 시간 업데이트
            logger.info(`📝 [generateTeamBlogPost] 블로그 설정 업데이트: ${blogRef.path}`);
            transaction.update(blogRef, {
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

          // 포스트 저장
          logger.info(`📝 [generateTeamBlogPost] 포스트 저장: ${postRef.path}`);
          transaction.set(postRef, blogPost);
        });

        logger.info(`✅ [generateTeamBlogPost] 트랜잭션 성공`);
      } catch (txError: any) {
        // 🔥 트랜잭션 에러 상세 로깅 (permission-denied 에러 명확히 표시)
        const errorCode = txError?.code || "unknown";
        const errorMessage = txError?.message || String(txError);
        
        logger.error(`❌ [generateTeamBlogPost] FIRESTORE_WRITE_ERROR:`, {
          error: errorMessage,
          code: errorCode,
          status: txError?.status,
          type: txError?.type,
          teamId,
          postPath: postRef.path,
          blogPath: blogRef.path,
          hasTeamId: !!blogPost.teamId,
          isPermissionDenied: errorCode === "permission-denied",
          // 🔥 Admin SDK 사용 여부 확인
          adminSDK: admin.apps.length > 0 ? "initialized" : "not initialized",
        });
        
        // 🔥 HttpsError가 아니면 변환 (Firestore 에러 코드 보존)
        if (txError instanceof HttpsError) {
          throw txError;
        }
        
        // 🔥 permission-denied 에러는 명확히 전달
        if (errorCode === "permission-denied") {
          throw new HttpsError(
            "permission-denied",
            `[permission-denied] Firestore 쓰기 권한이 없습니다. Admin SDK 초기화를 확인하세요.`,
            {
              code: "permission-denied",
              message: errorMessage,
              originalError: String(txError),
              teamId,
              postPath: postRef.path,
              blogPath: blogRef.path,
              adminSDKInitialized: admin.apps.length > 0,
            }
          );
        }
        
        // 기타 Firestore 에러 코드를 그대로 전달
        throw new HttpsError(
          errorCode === "failed-precondition" ? "failed-precondition" : "internal",
          `[${errorCode}] ${errorMessage}`,
          {
            code: errorCode,
            message: errorMessage,
            originalError: String(txError),
            teamId,
            postPath: postRef.path,
            blogPath: blogRef.path,
          }
        );
      }

      logger.info(`✅ [generateTeamBlogPost] 팀 ${teamId} 블로그 포스트 생성 완료: ${postRef.id}`);

      // 🔥 Rate limit 업데이트 (성공 시에만)
      await rateLimitRef.set({
        lastGeneratedAt: FieldValue.serverTimestamp(),
        teamId,
        uid,
      }, { merge: true });

      return {
        ok: true,
        postId: postRef.id,
        slug: blogSettings.teamSlug,
      };
    } catch (error: any) {
      // 🔥 상세 에러 로깅 (internal 안에 숨은 진짜 코드 확인)
      logger.error(`❌ [generateTeamBlogPost] 블로그 포스트 생성 실패:`, {
        error: error?.message || String(error),
        code: error?.code,
        status: error?.status,
        type: error?.type,
        stack: error?.stack,
        teamId,
        // 🔥 Firestore 관련 에러 상세 정보
        firestoreError: error?.code === "permission-denied" || error?.code === "failed-precondition" 
          ? "Firestore Rules 문제 가능성" 
          : undefined,
        postType: request.data?.postType,
      });
      
      // 🔥 HttpsError로 감싸서 클라이언트에서 상세 정보를 전달
      // internal 안에 숨은 진짜 코드를 전달
      const errorMessage = error?.message || "알 수 없는 오류입니다.";
      const errorCode = error?.code || "internal";
      
      // 🔥 에러 메시지에 코드 포함 (details가 전달되지 않을 경우 대비)
      const enhancedMessage = `[${errorCode}] ${errorMessage}`;
      
      // 🔥 Firestore 에러 코드는 그대로 전달 (permission-denied, failed-precondition 등)
      const httpsErrorCode = errorCode === "permission-denied" ? "permission-denied" : 
                             errorCode === "failed-precondition" ? "failed-precondition" : 
                             "internal";
      
      throw new HttpsError(
        httpsErrorCode,
        enhancedMessage, // 🔥 메시지에 코드 포함
        {
          message: errorMessage,
          code: errorCode, // 🔥 진짜 에러 코드 전달
          originalError: String(error), // 원본 에러 문자열화 (객체는 직렬화 안 될 수 있음)
          firestoreError: errorCode === "permission-denied" || errorCode === "failed-precondition",
          teamId,
          postType: request.data?.postType,
          stack: error?.stack?.substring(0, 500), // 스택 일부만 전달
        }
      );
    }
  }
);

/**
 * 🔥 팀 블로그 포스트 생성 (HTTP API)
 * 프론트엔드에서 fetch로 호출 가능
 */
export const generateTeamBlogPostAPI = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 120,
    memory: "512MiB",
    secrets: ["OPENAI_API_KEY"],
  },
  async (req, res) => {
    // 🔥 CORS 처리
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    try {
      const { teamId, postType } = req.body;

      if (!teamId) {
        res.status(400).json({ ok: false, error: "teamId is required" });
        return;
      }

      // 🔥 Firebase Admin 초기화
      if (admin.apps.length === 0) {
        admin.initializeApp();
      }
      const db = getFirestore();

      // 🔥 1) 인증 토큰 확인 (필수)
      const authHeader = req.headers.authorization || "";
      const match = authHeader.match(/^Bearer (.+)$/);
      if (!match) {
        res.status(401).json({ ok: false, error: "unauthenticated", message: "인증 토큰이 필요합니다." });
        return;
      }

      let uid: string;
      try {
        const decoded = await admin.auth().verifyIdToken(match[1]);
        uid = decoded.uid;
        logger.info(`✅ [generateTeamBlogPostAPI] 인증 확인 완료: ${uid}`);
      } catch (authError: any) {
        logger.error(`❌ [generateTeamBlogPostAPI] 토큰 검증 실패:`, authError);
        res.status(401).json({ ok: false, error: "unauthenticated", message: "유효하지 않은 인증 토큰입니다." });
        return;
      }

      // 🔥 2) 팀 정보 조회
      const teamDoc = await db.doc(`teams/${teamId}`).get();
      if (!teamDoc.exists) {
        res.status(404).json({ ok: false, error: "team-not-found", message: "팀을 찾을 수 없습니다." });
        return;
      }
      const teamData = teamDoc.data();

      // 🔥 3) 권한 체크: 관리자만 생성 가능
      try {
        await requireAdmin(teamId, uid);
        logger.info(`✅ [generateTeamBlogPostAPI] 권한 확인 완료: ${uid} (admin)`);
      } catch (authError: any) {
        logger.warn(`⚠️ [generateTeamBlogPostAPI] 권한 체크 실패:`, authError);
        res.status(403).json({ 
          ok: false, 
          error: "permission-denied", 
          message: "관리자 권한이 필요합니다." 
        });
        return;
      }

      // 🔥 4) 플랜 체크: Pro 플랜만 허용
      const plan = teamData?.plan as "free" | "pro" | undefined;
      if (plan !== "pro") {
        logger.warn(`⚠️ [generateTeamBlogPostAPI] 플랜 체크 실패: ${plan} (Pro 필요)`);
        res.status(403).json({ 
          ok: false, 
          error: "not-pro", 
          message: "Pro 플랜이 필요합니다. 업그레이드해주세요." 
        });
        return;
      }

      // 🔥 postType 결정
      let actualPostType: string;
      if (postType) {
        actualPostType = postType;
      } else {
        // 자동 주제 결정
        const autoTopic = await decideNextPostTopic(db, teamId);
        actualPostType = autoTopic;
        logger.info(`🎯 [generateTeamBlogPostAPI] 자동 주제 결정: ${autoTopic}`);
      }

      // 🔥 블로그 설정 확인
      const blogRef = db.doc(`teams/${teamId}/blog/settings`);
      const blogSnap = await blogRef.get();
      
      let blogSettings: BlogSettings;
      let isNewBlog = false;
      
      if (!blogSnap.exists) {
        isNewBlog = true;
        const teamSlug = generateTeamSlug(teamData.name || `team-${teamId}`);
        blogSettings = {
          enabled: true,
          plan: (teamData.plan as "free" | "pro") || "free",
          teamSlug,
          createdAt: FieldValue.serverTimestamp() as Timestamp,
          updatedAt: FieldValue.serverTimestamp() as Timestamp,
        };
      } else {
        blogSettings = blogSnap.data() as BlogSettings;
      }

      // 🔥 5) Rate Limit 체크 (팀당 1분 쿨타임)
      const rateLimitRef = db.doc(`teams/${teamId}/blog/rateLimit`);
      const rateLimitSnap = await rateLimitRef.get();
      const now = Date.now();
      const lastGeneratedAt = rateLimitSnap.data()?.lastGeneratedAt?.toMillis?.() || 0;
      const cooldownMs = 60 * 1000; // 1분

      if (now - lastGeneratedAt < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - lastGeneratedAt)) / 1000);
        logger.warn(`⚠️ [generateTeamBlogPostAPI] Rate limit 초과: ${remainingSeconds}초 대기 필요`);
        res.status(429).json({ 
          ok: false, 
          error: "rate-limit-exceeded", 
          message: `너무 빈번한 요청입니다. ${remainingSeconds}초 후 다시 시도해주세요.`,
          retryAfter: remainingSeconds
        });
        return;
      }

      // 🔥 6) 무료 플랜 제한 체크 (Pro 플랜은 이미 위에서 확인했으므로 이 체크는 이중 안전장치)
      if (blogSettings.plan === "free" && actualPostType !== "intro") {
        const postsRef = db.collection(`teams/${teamId}/blog_posts`);
        const existingPosts = await postsRef.where("status", "==", "published").get();
        
        if (existingPosts.size >= 1) {
          res.status(403).json({ 
            ok: false, 
            error: "free-plan-limit", 
            message: "무료 플랜은 월 2개 글까지만 생성 가능합니다. Pro로 업그레이드하세요." 
          });
          return;
        }
      }

      // 🔥 AI로 블로그 포스트 생성
      const post = await generateBlogPostContent(teamId, teamData, actualPostType, blogSettings.plan);

      if (!post || !post.title || !post.content) {
        res.status(500).json({ ok: false, error: "AI 블로그 포스트 생성에 실패했습니다." });
        return;
      }

      // 🔥 첫 글인 경우 메타 정보 추가
      const isFirstPost = actualPostType === "intro";
      const enhancedContent = isFirstPost
        ? enhanceFirstPostContent(post.content, blogSettings.plan)
        : post.content;

      // 🔥 트랜잭션으로 원자적 저장
      const postRef = db.collection(`teams/${teamId}/blog_posts`).doc();
      const blogPost: BlogPost = {
        ...post,
        content: enhancedContent,
        status: "published",
        createdAt: FieldValue.serverTimestamp() as Timestamp,
        createdBy: "ai",
        postType: actualPostType,
        publishedAt: FieldValue.serverTimestamp() as Timestamp,
        viewCount: 0,
        plan: blogSettings.plan,
        teamId,
      };

      await db.runTransaction(async (transaction) => {
        const blogSnapInTx = await transaction.get(blogRef);
        
        if (!blogSnapInTx.exists && isNewBlog) {
          transaction.set(blogRef, blogSettings);
        } else if (blogSnapInTx.exists) {
          transaction.update(blogRef, {
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        transaction.set(postRef, blogPost);
      });

      logger.info(`✅ [generateTeamBlogPostAPI] 팀 ${teamId} 블로그 포스트 생성 완료: ${postRef.id}`);

      // 🔥 Rate limit 업데이트 (성공 시에만)
      await rateLimitRef.set({
        lastGeneratedAt: FieldValue.serverTimestamp(),
        teamId,
        uid,
      }, { merge: true });

      res.status(200).json({
        ok: true,
        postId: postRef.id,
        slug: blogSettings.teamSlug,
        postType: actualPostType,
      });
    } catch (error: any) {
      logger.error(`❌ [generateTeamBlogPostAPI] 블로그 포스트 생성 실패:`, {
        error: error?.message || String(error),
        code: error?.code,
        teamId: req.body?.teamId,
      });

      res.status(500).json({
        ok: false,
        error: error?.message || "알 수 없는 오류입니다.",
        code: error?.code,
      });
    }
  }
);

/**
 * 주간 자동 블로그 포스트 생성 (Scheduled)
 */
/**
 * 🔥 주간 자동 기록 생성 (Scheduler / Cron)
 * 매주 월요일 03:00 (트래픽 없는 시간)
 * 활동이 있었을 때만 기록 생성, 없었으면 완전히 침묵
 */
export const autoWeeklyTeamPost = onSchedule(
  {
    schedule: "0 3 * * 1", // 매주 월요일 03:00
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    const db = getFirestore();
    const startTime = new Date();
    let processedTeams = 0;
    let createdPosts = 0;
    
    logger.info("📝 [WEEKLY_JOB] 주간 자동 기록 생성 시작", {
      timestamp: startTime.toISOString(),
    });

    try {
      // 🔥 비용 상한선 체크 (월간 생성 한도)
      const costLimitRef = db.doc("system/blog_generation_limits");
      const costLimitSnap = await costLimitRef.get();
      const costLimit = costLimitSnap.data() || { monthlyLimit: 100, currentMonth: 0, resetDate: null };
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      
      // 월간 한도 초과 시 조기 종료
      if (costLimit.currentMonth >= costLimit.monthlyLimit) {
        logger.warn(`⚠️ [WEEKLY_JOB] 월간 생성 한도 초과: ${costLimit.currentMonth}/${costLimit.monthlyLimit}`);
        return;
      }

      // Pro 플랜 + 활성 상태 팀만 조회
      const teamsSnap = await db.collection("teams")
        .where("plan", "==", "pro")
        .get();
      
      const blogPromises = teamsSnap.docs.map(async (teamDoc) => {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();
        
        // 🔥 휴면 팀 스킵
        if (teamData.status === "inactive" || teamData.isDeleted === true) {
          return;
        }
        
        const blogSettingsRef = db.doc(`teams/${teamId}/blog/settings`);
        const blogSettingsSnap = await blogSettingsRef.get();

        if (!blogSettingsSnap.exists) {
          return; // 블로그 미활성화
        }

        const blogSettings = blogSettingsSnap.data() as BlogSettings;
        if (!blogSettings.enabled) {
          return; // 블로그 비활성화
        }

        // Pro 플랜만 자동 생성 (이미 쿼리에서 필터링했지만 이중 체크)
        if (blogSettings.plan !== "pro") {
          return;
        }

        processedTeams++;
        
        // 🔥 중복 생성 방지: 이번 주 기록이 이미 있는지 확인
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // 이번 주 월요일
        weekStart.setHours(0, 0, 0, 0);
        
        // weekKey 생성 (예: "2025-W03")
        const year = weekStart.getFullYear();
        const weekNum = getWeekNumber(weekStart);
        const weekKey = `${year}-W${weekNum.toString().padStart(2, "0")}`;
        
        // 🔥 활동 데이터 확인 (지난 7일)
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

        // 🔥 5-3: 자동 실행 트리거 - 조회수 기반 조건 확인
        // 최근 7일 내 생성 글 존재 확인
        const recentPostsRef = db.collection(`teams/${teamId}/blog_posts`);
        const recentPostsSnap = await recentPostsRef
          .where("status", "==", "published")
          .where("publishedAt", ">=", Timestamp.fromDate(sevenDaysAgo))
          .orderBy("publishedAt", "desc")
          .limit(5)
          .get();

        let shouldAutoGenerate = false;

        if (recentPostsSnap.empty) {
          // 최근 글 없으면 기본 weekly 생성
          shouldAutoGenerate = true;
        } else {
          // 조회수 조건 충족 확인
          recentPostsSnap.docs.forEach(doc => {
            const post = doc.data();
            const viewCount = post.viewCount || 0;
            const publishedAt = post.publishedAt as Timestamp;
            const threshold = analyzeViewCountThreshold(viewCount, publishedAt, now);
            
            // 조회수 10명 이상 + 24시간 이내 → 빠른 반응
            // 또는 조회수 30명 이상 + 7일 이내 → 장기 관심
            if (threshold.isGrowthTrigger && threshold.timeWindow === "fast") {
              shouldAutoGenerate = true;
            } else if (threshold.isPopular && threshold.timeWindow === "normal") {
              shouldAutoGenerate = true;
            }
          });
        }

        if (!shouldAutoGenerate) {
          // 조회수 조건 미충족 → 건너뜀 (조용히)
          return;
        }

        // 이번 주 주간 기록이 이미 있는지 확인 (weekly 타입만)
        const existingWeeklyPostsSnap = await recentPostsRef
          .where("postType", "==", "weekly")
          .where("weekKey", "==", weekKey)
          .limit(1)
          .get();
        
        if (!existingWeeklyPostsSnap.empty) {
          // 이미 이번 주 weekly 기록이 있으면 건너뜀
          return;
        }

        // 최소 조건: 출석 기록 1건 이상 OR 경기/모임 로그 1건 이상
        const attendanceRef = db.collection(`teams/${teamId}/attendance`);
        const attendanceSnap = await attendanceRef
          .where("date", ">=", sevenDaysAgoStr)
          .limit(1)
          .get();

        const schedulesRef = db.collection(`teams/${teamId}/schedules`);
        const schedulesSnap = await schedulesRef
          .where("date", ">=", sevenDaysAgoStr)
          .limit(1)
          .get();

        // 🔥 활동 없으면 아무 것도 안 함 (완전히 침묵)
        if (attendanceSnap.empty && schedulesSnap.empty) {
          return; // 로그도 남기지 않음
        }

        try {
          const teamData = teamDoc.data();
          
          // 🔥 5-2: 다음 글 주제 자동 결정
          const nextTopic = await decideNextPostTopic(db, teamId, "weekly");
          
          // 활동 데이터 수집 (프롬프트용)
          const activityData = {
            attendance: attendanceSnap.docs.map(doc => doc.data()),
            schedules: schedulesSnap.docs.map(doc => doc.data()),
          };
          
          const post = await generateBlogPostContent(
            teamId, 
            teamData, 
            nextTopic, 
            "pro"
          );

          // AI 생성 실패 시 저장 안 함
          if (!post || !post.title || !post.content) {
            return; // 조용히 실패
          }

          // 🔥 트랜잭션으로 원자적 저장
          const postRef = db.collection(`teams/${teamId}/blog_posts`).doc();
          await db.runTransaction(async (transaction) => {
            transaction.set(postRef, {
              ...post,
              status: "published",
              createdAt: FieldValue.serverTimestamp(),
              createdBy: "ai_auto", // 🔥 5-4: 자동 생성 표시
              postType: nextTopic,
              publishedAt: FieldValue.serverTimestamp(),
              viewCount: 0,
              plan: "pro",
              teamId, // Rules 체크용
              weekKey: nextTopic === "weekly" ? weekKey : undefined, // weekly만 weekKey 사용
              isAutoGenerated: true, // 🔥 5-4: 자동 생성 플래그
            });

            // 마지막 포스트 시간 업데이트
            transaction.update(blogSettingsRef, {
              updatedAt: FieldValue.serverTimestamp(),
            });
          });

          createdPosts++;
          
          // 🔥 비용 카운터 증가 (성공 시에만)
          await costLimitRef.set({
            monthlyLimit: costLimit.monthlyLimit,
            currentMonth: (costLimit.currentMonth || 0) + 1,
            resetDate: costLimit.resetDate || Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
            lastUpdated: FieldValue.serverTimestamp(),
          }, { merge: true });
        } catch (error) {
          // 🔥 한 팀 실패해도 전체 중단하지 않음 (조용히 실패)
          // 로그는 남기되, 알림 폭탄은 피함
          logger.warn(`⚠️ [autoWeeklyTeamPost] 팀 ${teamId} 기록 생성 실패 (조용히 건너뜀):`, {
            error: error instanceof Error ? error.message : String(error),
          });
          
          // 🔥 일시적 오류는 재시도 트리거 (Pub/Sub 자동 재시도)
          if (error instanceof Error && (
            error.message.includes("rate-limit") ||
            error.message.includes("temporary") ||
            error.message.includes("timeout")
          )) {
            throw error; // Pub/Sub가 자동 재시도
          }
        }
      });

      await Promise.all(blogPromises);
      
      // 🔥 로그 정책: 실행 시각, 처리 팀 수, 생성된 기록 수만
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      
      logger.info("✅ [WEEKLY_JOB] 주간 자동 기록 생성 완료", {
        timestamp: endTime.toISOString(),
        processedTeams,
        createdPosts,
        duration: `${duration.toFixed(2)}s`,
      });
    } catch (error) {
      // 🔥 전체 실패 시에도 조용히 처리
      logger.error("❌ [WEEKLY_JOB] 전체 작업 실패 (다음 주에 다시 시도):", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * 주차 번호 계산 (ISO 8601 기준)
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * AI로 블로그 포스트 콘텐츠 생성
 */
async function generateBlogPostContent(
  teamId: string,
  teamData: any,
  postType: string,
  plan: "free" | "pro"
): Promise<{ title: string; content: string; excerpt: string; seoMeta: { title?: string; description?: string; keywords?: string[] } }> {
  const db = getFirestore();
  
  // 🔥 함수 내부에서 OpenAI lazy import (배포 로딩 단계에서 무거운 초기화 방지)
  const OpenAI = (await import("openai")).default;
  
  // 🔥 함수 내부에서 API 키 가져오기 (Functions v2에서는 process.env만 사용)
  const apiKey = process.env.OPENAI_API_KEY;
  
  // 🔥 확인용 로그 (최종 확인)
  console.log("OPENAI KEY EXISTS:", !!apiKey);
  
  if (!apiKey) {
    logger.error("❌ [generateBlogPostContent] OPENAI_API_KEY가 설정되지 않았습니다.");
    throw new Error("OpenAI API 키가 설정되지 않았습니다. Firebase Console > Functions > Configuration > Environment variables에서 OPENAI_API_KEY를 설정해주세요.");
  }
  
  // 🔥 함수 내부에서 OpenAI 인스턴스 생성
  const openai = new OpenAI({ apiKey });
  
  logger.info(`✅ [generateBlogPostContent] OpenAI 클라이언트 생성 완료 (키 길이: ${apiKey.length})`);

  // 팀 데이터 수집
  const membersRef = db.collection(`teams/${teamId}/members`);
  // ⚠️ 인덱스 필요성이 있는 "!=" 쿼리 대신 전체 조회 후 필터링으로 처리
  const membersSnap = await membersRef.get();
  const memberCount = membersSnap.docs.filter((doc) => doc.data().isDeleted !== true).length;

  // 최근 활동 데이터 수집 (주간 포스트용)
  let recentActivity = "";
  if (postType === "weekly") {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // 이번 주 월요일
    const weekStartStr = weekStart.toISOString().split("T")[0];

    // 출석 데이터
    const attendanceRef = db.collection(`teams/${teamId}/attendance`);
    const attendanceSnap = await attendanceRef
      .where("date", ">=", weekStartStr)
      .limit(10)
      .get();
    
    if (!attendanceSnap.empty) {
      recentActivity += `이번 주 출석: ${attendanceSnap.size}건\n`;
    }

    // 일정 데이터
    const schedulesRef = db.collection(`teams/${teamId}/schedules`);
    const schedulesSnap = await schedulesRef
      .where("date", ">=", weekStartStr)
      .limit(5)
      .get();
    
    if (!schedulesSnap.empty) {
      recentActivity += `이번 주 일정: ${schedulesSnap.size}건\n`;
    }
  }

  // 프롬프트 생성
  const prompt = buildBlogPrompt(teamData, postType, memberCount, recentActivity, plan);

  // 🔥 OpenAI API 키 확인 (getOpenAIClient가 자동으로 처리하지만, 명시적 확인)
  const apiKeyForCheck = process.env.OPENAI_API_KEY;
  if (!apiKeyForCheck) {
    logger.error("❌ [generateBlogPostContent] OPENAI_API_KEY가 설정되지 않았습니다.", {
      hasEnvKey: !!apiKey,
      envKeys: Object.keys(process.env).filter(k => k.includes("OPENAI") || k.includes("openai")),
    });
    throw new Error("OpenAI API 키가 설정되지 않았습니다. Firebase Console > Functions > Configuration > Environment variables에서 OPENAI_API_KEY를 설정해주세요.");
  }
  
  logger.info(`✅ [generateBlogPostContent] OpenAI API 키 확인 완료 (키 길이: ${apiKey.length})`);

  try {
    // 🔥 시스템 프롬프트 (고정 · 절대 수정 금지)
    const systemPrompt = `당신은 홍보 글을 쓰지 않습니다.
당신은 팀의 활동을 '기록'하는 역할입니다.

과장, 감탄사, 마케팅 표현을 사용하지 마세요.
사실과 맥락 위주로 담담하게 작성하세요.

이 글의 목적은 설득이 아니라 보관입니다.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5, // 🔥 낮춰서 일관성 향상
    });

    const aiResponse = completion.choices[0]?.message?.content || "";
    
    if (!aiResponse) {
      logger.error("❌ [generateBlogPostContent] OpenAI 응답이 비어있습니다.");
      throw new Error("AI 응답을 받지 못했습니다. 다시 시도해주세요.");
    }

    // 🔥 생성 후 자동 필터 (홍보 톤 감지)
    if (detectPromoTone(aiResponse)) {
      logger.warn("⚠️ [generateBlogPostContent] 홍보 톤 감지, 재생성 시도");
      // 재생성 (최대 2회)
      const retryResponse = await retryGeneration(openai, systemPrompt, prompt, 2);
      if (retryResponse && !detectPromoTone(retryResponse)) {
        const parsed = parseAIResponse(retryResponse);
        return validateAndReturn(parsed, teamData);
      }
      // 재생성 실패 시 경고 로그만 남기고 진행
      logger.warn("⚠️ [generateBlogPostContent] 재생성 후에도 홍보 톤 감지, 기본 필터 적용");
    }

    const parsed = parseAIResponse(aiResponse);
    
    // 🔥 프론트 저장 전 마지막 체크
    const validated = validateAndReturn(parsed, teamData);

    // SEO 최적화 (Pro 플랜만)
    const seoMeta = plan === "pro" 
      ? await optimizeSEO(validated.title, validated.content, teamData, openai)
      : {
          title: validated.title,
          description: validated.excerpt,
          keywords: [],
        };

    return {
      title: validated.title,
      content: validated.content,
      excerpt: validated.excerpt,
      seoMeta,
    };
  } catch (error: any) {
    logger.error("❌ [generateBlogPostContent] OpenAI API 호출 실패:", {
      error: error?.message || String(error),
      code: error?.code,
      status: error?.status,
      type: error?.type,
      stack: error?.stack,
    });
    
    // OpenAI API 관련 에러인 경우 상세 메시지 전달
    if (error?.code === "invalid_api_key" || error?.message?.includes("API key")) {
      throw new Error("OpenAI API 키가 유효하지 않습니다. 서버 환경 변수를 확인해주세요.");
    }
    if (error?.code === "insufficient_quota" || error?.message?.includes("quota")) {
      throw new Error("OpenAI API 할당량이 부족합니다. 계정을 확인해주세요.");
    }
    if (error?.status === 429 || error?.message?.includes("rate limit")) {
      throw new Error("OpenAI API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
    }
    
    throw new Error(`블로그 포스트 생성에 실패했습니다: ${error?.message || "알 수 없는 오류"}`);
  }
}

/**
 * 블로그 프롬프트 생성
 */
function buildBlogPrompt(
  teamData: any,
  postType: string,
  memberCount: number,
  recentActivity: string,
  plan: "free" | "pro"
): string {
  const teamName = teamData.name || "우리 팀";
  const sportType = teamData.sportType || "스포츠";
  const location = teamData.location || "";
  const ageGroup = teamData.ageGroup || "";

  switch (postType) {
    case "team_atmosphere":
      return `팀의 분위기와 멤버들의 이야기를 담은 글을 작성하세요.

팀명: ${teamName}
스포츠: ${sportType}
${location ? `지역: ${location}` : ""}
${ageGroup ? `연령대: ${ageGroup}` : ""}
멤버 수: ${memberCount}명

${recentActivity ? `최근 활동:\n${recentActivity}` : ""}

규칙:
- 4~5문단
- 각 문단 2~3문장
- 팀의 일상적인 분위기를 담담하게 기록
- 멤버들의 이야기나 에피소드 포함 (구체적이지 않으면 일반적으로)
- 감탄사나 홍보 문장 금지

구성:
1문단: 팀이 모일 때의 분위기
2문단: 멤버들의 특징이나 이야기
3문단: 함께하는 시간의 의미
4문단: 앞으로의 기대

응답 형식:
TITLE: [제목]
EXCERPT: [요약 1문장]
CONTENT: [본문 HTML]
`;

    case "growth_report":
      return `팀의 성장과 변화를 기록한 리포트를 작성하세요.

팀명: ${teamName}
스포츠: ${sportType}
${location ? `지역: ${location}` : ""}
${ageGroup ? `연령대: ${ageGroup}` : ""}
멤버 수: ${memberCount}명

${recentActivity ? `최근 활동:\n${recentActivity}` : ""}

규칙:
- 4~5문단
- 각 문단 2~3문장
- 팀의 변화나 성장을 사실 위주로 기록
- 숫자나 구체적 변화가 있으면 포함
- 감탄사나 홍보 문장 금지

구성:
1문단: 최근 변화나 성장의 맥락
2문단: 구체적인 변화 내용
3문단: 변화의 의미나 배경
4문단: 앞으로의 방향

응답 형식:
TITLE: [제목]
EXCERPT: [요약 1문장]
CONTENT: [본문 HTML]
`;

    case "schedule_preview":
      return `다가오는 일정이나 계획을 예고하는 글을 작성하세요.

팀명: ${teamName}
스포츠: ${sportType}
${location ? `지역: ${location}` : ""}
${ageGroup ? `연령대: ${ageGroup}` : ""}
멤버 수: ${memberCount}명

${recentActivity ? `최근 활동:\n${recentActivity}` : ""}

규칙:
- 4~5문단
- 각 문단 2~3문장
- 다가오는 일정이나 계획을 담담하게 소개
- 구체적 일정이 없으면 일반적인 계획으로
- 감탄사나 홍보 문장 금지

구성:
1문단: 다가오는 일정의 맥락
2문단: 구체적인 일정이나 계획
3문단: 기대되는 점
4문단: 멤버들에게 전하는 메시지

응답 형식:
TITLE: [제목]
EXCERPT: [요약 1문장]
CONTENT: [본문 HTML]
`;

    case "memorable_moment":
      return `팀의 기억에 남는 순간을 회고하는 글을 작성하세요.

팀명: ${teamName}
스포츠: ${sportType}
${location ? `지역: ${location}` : ""}
${ageGroup ? `연령대: ${ageGroup}` : ""}
멤버 수: ${memberCount}명

${recentActivity ? `최근 활동:\n${recentActivity}` : ""}

규칙:
- 4~5문단
- 각 문단 2~3문장
- 기억에 남는 순간이나 경험을 담담하게 기록
- 구체적 에피소드가 없으면 일반적으로
- 감탄사나 홍보 문장 금지

구성:
1문단: 기억에 남는 순간의 맥락
2문단: 구체적인 순간이나 경험
3문단: 그 순간의 의미
4문단: 앞으로의 기억

응답 형식:
TITLE: [제목]
EXCERPT: [요약 1문장]
CONTENT: [본문 HTML]
`;

    case "intro":
      // 🔥 입력 데이터 포맷 (없는 정보는 언급하지 않음)
      const introData: any = {
        teamName: teamName,
        sport: sportType,
      };
      if (location) introData.region = location;
      if (ageGroup) introData.ageGroup = ageGroup;
      if (memberCount > 0) introData.memberCount = memberCount;
      
      return `아래 팀 정보를 바탕으로 팀 소개 글을 작성하세요.

${JSON.stringify(introData, null, 2)}

규칙:
- 4~6문단
- 각 문단 2~3문장
- 감탄사 사용 금지
- 홍보 문장 금지
- "함께하세요", "많은 관심" 같은 표현 금지
- 없는 정보는 절대 만들어내지 말 것
- 입력 안 준 필드는 언급하지 말 것

구성:
1문단: 팀이 언제, 어떤 맥락으로 모이는지
2문단: 활동 방식과 분위기
3문단: 팀의 연령대와 운동 목적 (연령대 정보가 있을 때만)
4문단: 꾸준히 이어지고 있다는 사실

마무리는 조용하게 끝내세요.

응답 형식:
TITLE: [제목]
EXCERPT: [요약]
CONTENT: [HTML 본문]`;

    case "weekly":
      // 🔥 활동 없으면 프롬프트 자체를 생성하지 않음 (이미 상위에서 필터링됨)
      if (!recentActivity || recentActivity.trim() === "") {
        throw new Error("활동 데이터가 없어 주간 기록을 생성할 수 없습니다.");
      }
      
      return `지난 1주일간 팀 활동을 정리하세요.

팀 정보:
- 팀명: ${teamName}
- 종목: ${sportType}
${memberCount > 0 ? `- 멤버 수: ${memberCount}명` : ""}

지난 주 활동:
${recentActivity}

규칙:
- 있었던 사실만 기록
- 평가, 감정, 홍보 표현 금지
- 감탄사 사용 금지
- "이번 주는 쉬었습니다" 같은 문구 금지 (활동 없으면 생성 자체를 안 함)

구성:
1문단: 이번 주 활동 여부 (있었던 사실만)
2문단: 진행 방식 (구체적인 내용)
3문단: 다음 활동 일정 (있으면만 언급, 없으면 생략)

마무리는 조용하게 끝내세요.

응답 형식:
TITLE: [제목]
EXCERPT: [요약]
CONTENT: [HTML 본문]`;

    case "activity_review":
      return `다음 정보를 바탕으로 "${teamName}" 팀의 활동 후기 블로그 글을 작성해주세요.

팀 정보:
- 팀명: ${teamName}
- 종목: ${sportType}
- 멤버 수: ${memberCount}명

활동 정보:
${recentActivity}

요구사항:
1. 제목: "오늘도 함께 땀 흘린 [팀명] ⚽" 또는 "포천에서 열린 이번 주 [종목] 모임 후기" 형식의 매력적인 제목
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

    default:
      throw new Error(`지원하지 않는 포스트 타입: ${postType}`);
  }
}

/**
 * AI 응답 파싱
 */
function parseAIResponse(response: string): { title: string; content: string; excerpt: string } {
  const titleMatch = response.match(/TITLE:\s*(.+)/i);
  const excerptMatch = response.match(/EXCERPT:\s*(.+)/i);
  const contentMatch = response.match(/CONTENT:\s*([\s\S]+)/i);

  return {
    title: titleMatch?.[1]?.trim() || "팀 소개",
    excerpt: excerptMatch?.[1]?.trim() || "",
    content: contentMatch?.[1]?.trim() || "<p>콘텐츠를 생성하는 중입니다.</p>",
  };
}

/**
 * SEO 최적화 (Pro 전용)
 */
async function optimizeSEO(
  title: string,
  content: string,
  teamData: any,
  openai: OpenAI
): Promise<{ title?: string; description?: string; keywords?: string[] }> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 SEO 전문가입니다. 블로그 포스트의 SEO 메타데이터를 최적화합니다.",
        },
        {
          role: "user",
          content: `다음 블로그 포스트의 SEO 메타데이터를 생성해주세요.

제목: ${title}
팀명: ${teamData.name}
종목: ${teamData.sportType}

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
    logger.warn("⚠️ [optimizeSEO] SEO 최적화 실패, 기본값 사용:", error);
    return {
      title,
      description: content.substring(0, 160),
      keywords: [],
    };
  }
}

/**
 * 첫 글 콘텐츠 강화 (메타 정보 + 유료 전환 씨앗 추가)
 */
function enhanceFirstPostContent(content: string, plan: "free" | "pro"): string {
  // AI 자동 생성 배지
  const aiBadge = `
    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-800 mb-2">
        <strong>🧠 AI 자동 생성 콘텐츠</strong> | <span class="text-xs">🕒 최초 생성 글</span>
      </p>
      ${plan === "free" ? `
        <p class="text-xs text-blue-700 mt-2">
          💡 이 글은 AI가 자동으로 생성했습니다. 
          <strong>Pro 플랜</strong>에서는 경기 후기 자동 작성, 주간 활동 요약, SNS 공유용 글 자동 생성을 제공합니다.
        </p>
      ` : `
        <p class="text-xs text-blue-700 mt-2">
          ✨ Pro 플랜으로 AI가 자동으로 관리하는 블로그입니다.
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

  // 기존 콘텐츠에 배지와 CTA 추가
  return content + aiBadge + ctaSection;
}

/**
 * 🔥 홍보 톤 감지 (자동 필터)
 */
function detectPromoTone(content: string): boolean {
  const promoKeywords = [
    "열정", "최고", "활기찬",
    "많은 분들의 관심",
    "함께하세요", "함께", "관심", "환영",
  ];
  
  const hasExclamation = /!/.test(content);
  const hasPromoKeyword = promoKeywords.some(keyword => content.includes(keyword));
  
  return hasExclamation || hasPromoKeyword;
}

/**
 * 🔥 재생성 (최대 retryCount회)
 */
async function retryGeneration(
  openai: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  retryCount: number
): Promise<string | null> {
  for (let i = 0; i < retryCount; i++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // 🔥 더 낮춰서 일관성 향상
      });
      
      const response = completion.choices[0]?.message?.content || "";
      if (response && !detectPromoTone(response)) {
        return response;
      }
    } catch (error) {
      logger.warn(`⚠️ [retryGeneration] 재생성 ${i + 1}회 실패:`, error);
    }
  }
  return null;
}

/**
 * 🔥 프론트 저장 전 마지막 체크
 */
function validateAndReturn(
  parsed: { title: string; content: string; excerpt: string },
  teamData: any
): { title: string; content: string; excerpt: string; seoMeta: { title?: string; description?: string; keywords?: string[] } } {
  const { title, content, excerpt } = parsed;
  
  // 홍보 톤 최종 체크
  if (
    content.includes("함께") ||
    content.includes("관심") ||
    content.includes("환영")
  ) {
    logger.warn("⚠️ [validateAndReturn] 홍보 톤 감지, 기본 톤으로 교체");
    // 기본 톤으로 교체 (최소한의 수정)
    const cleanedContent = content
      .replace(/함께하세요/g, "")
      .replace(/많은 관심/g, "")
      .replace(/환영합니다/g, "");
    
    return {
      title: title.replace(/!$/, ""), // 느낌표 제거
      content: cleanedContent || content,
      excerpt: excerpt.replace(/!$/, ""),
      seoMeta: {},
    };
  }
  
  return {
    ...parsed,
    seoMeta: {},
  };
}

/**
 * 🔥 5-1: 조회수 임계치 규칙
 * 시간 + 조회수 같이 본다
 */
interface ViewCountThreshold {
  isGrowthTrigger: boolean;  // viewCount >= 10
  isPopular: boolean;         // viewCount >= 30
  isRepresentative: boolean; // viewCount >= 100
  timeWindow: "fast" | "normal" | "slow"; // 24시간/7일/30일
}

function analyzeViewCountThreshold(
  viewCount: number,
  publishedAt: Timestamp,
  now: Date = new Date()
): ViewCountThreshold {
  const publishedDate = publishedAt.toDate();
  const hoursSincePublished = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60);
  const daysSincePublished = hoursSincePublished / 24;

  const isGrowthTrigger = viewCount >= 10;
  const isPopular = viewCount >= 30;
  const isRepresentative = viewCount >= 100;

  let timeWindow: "fast" | "normal" | "slow";
  if (isGrowthTrigger && hoursSincePublished <= 24) {
    timeWindow = "fast"; // 빠른 반응
  } else if (isPopular && daysSincePublished <= 7) {
    timeWindow = "normal"; // 장기 관심
  } else {
    timeWindow = "slow";
  }

  return {
    isGrowthTrigger,
    isPopular,
    isRepresentative,
    timeWindow,
  };
}

/**
 * 🔥 5-2: 다음 글 주제 자동 결정 로직
 * AI에게 자유를 주지 않는다 → 선택지 중에서만 고르게 한다
 */
async function decideNextPostTopic(
  db: FirebaseFirestore.Firestore,
  teamId: string,
  currentPostType?: BlogPostTopic
): Promise<BlogPostTopic> {
  // 최근 10개 글 조회 (조회수 + 타입 분석)
  const postsRef = db.collection(`teams/${teamId}/blog_posts`);
  const recentPostsSnap = await postsRef
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(10)
    .get();

  if (recentPostsSnap.empty) {
    return "weekly"; // 첫 글이면 안전하게 활동 요약
  }

  const recentPosts = recentPostsSnap.docs.map(doc => ({
    id: doc.id,
    postType: doc.data().postType as BlogPostTopic,
    viewCount: doc.data().viewCount || 0,
    publishedAt: doc.data().publishedAt as Timestamp,
  }));

  // 인기 글 타입 찾기 (조회수 상위 3개 중 가장 많은 타입)
  const topPosts = recentPosts
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 3);
  
  const popularTypeCount: Record<BlogPostTopic, number> = {
    weekly: 0,
    team_atmosphere: 0,
    growth_report: 0,
    schedule_preview: 0,
    memorable_moment: 0,
  };

  topPosts.forEach(post => {
    if (post.postType in popularTypeCount) {
      popularTypeCount[post.postType as BlogPostTopic]++;
    }
  });

  const mostPopularType = Object.entries(popularTypeCount)
    .sort(([, a], [, b]) => b - a)[0]?.[0] as BlogPostTopic;

  // 같은 타입 2회 연속 금지 체크
  const lastTwoTypes = recentPosts.slice(0, 2).map(p => p.postType);
  const isConsecutive = lastTwoTypes.length === 2 && lastTwoTypes[0] === lastTwoTypes[1];

  // 선택 로직
  let nextTopic: BlogPostTopic;

  if (isConsecutive && lastTwoTypes[0]) {
    // 같은 타입 2회 연속이면 다른 타입 선택
    const availableTopics = BLOG_TOPIC_POOL.filter(t => t !== lastTwoTypes[0]);
    nextTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
  } else if (mostPopularType === "weekly") {
    // 인기 글 타입이 활동 요약이면 → 팀 분위기
    nextTopic = "team_atmosphere";
  } else if (mostPopularType === "memorable_moment") {
    // 인기 글 타입이 회고면 → 다음 일정 예고
    nextTopic = "schedule_preview";
  } else if (recentPosts[0]?.viewCount < 10) {
    // 조회수 낮으면 → 다시 활동 요약 (안전)
    nextTopic = "weekly";
  } else {
    // 기본: 인기 타입과 다른 타입 선택
    const availableTopics = BLOG_TOPIC_POOL.filter(t => t !== mostPopularType);
    nextTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
  }

  return nextTopic;
}

/**
 * 팀 슬러그 생성 (URL 친화적)
 */
function generateTeamSlug(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

/**
 * 🤖 월간 자동 생성 스케줄러
 * 매월 1일 09:00 KST 실행
 */
export const autoMonthlyTeamPost = onSchedule(
  {
    schedule: "0 9 1 * *", // 매월 1일 09:00
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    const db = getFirestore();
    const startTime = new Date();
    let processedTeams = 0;
    let createdPosts = 0;
    
    logger.info("📝 [MONTHLY_JOB] 월간 자동 기록 생성 시작", {
      timestamp: startTime.toISOString(),
    });

    try {
      // 🔥 비용 상한선 체크
      const costLimitRef = db.doc("system/blog_generation_limits");
      const costLimitSnap = await costLimitRef.get();
      const costLimit = costLimitSnap.data() || { monthlyLimit: 100, currentMonth: 0, resetDate: null };
      const now = new Date();
      
      // 월간 한도 초과 시 조기 종료
      if (costLimit.currentMonth >= costLimit.monthlyLimit) {
        logger.warn(`⚠️ [MONTHLY_JOB] 월간 생성 한도 초과: ${costLimit.currentMonth}/${costLimit.monthlyLimit}`);
        return;
      }

      // Pro 플랜 + 활성 상태 팀만 조회
      const teamsSnap = await db.collection("teams")
        .where("plan", "==", "pro")
        .get();
      
      const blogPromises = teamsSnap.docs.map(async (teamDoc) => {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();
        
        // 🔥 휴면 팀 스킵
        if (teamData.status === "inactive" || teamData.isDeleted === true) {
          return;
        }
        
        const blogSettingsRef = db.doc(`teams/${teamId}/blog/settings`);
        const blogSettingsSnap = await blogSettingsRef.get();

        if (!blogSettingsSnap.exists || !blogSettingsSnap.data()?.enabled) {
          return;
        }

        const blogSettings = blogSettingsSnap.data() as BlogSettings;
        if (blogSettings.plan !== "pro") {
          return;
        }

        processedTeams++;
        
        // 🔥 이번 달 월간 리포트가 이미 있는지 확인
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        
        const existingMonthlyPostsSnap = await db.collection(`teams/${teamId}/blog_posts`)
          .where("postType", "==", "growth_report")
          .where("monthKey", "==", monthKey)
          .limit(1)
          .get();
        
        if (!existingMonthlyPostsSnap.empty) {
          return; // 이미 이번 달 리포트 있음
        }

        // 🔥 지난 달 활동 데이터 확인 (최소 1건 이상)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        
        const attendanceSnap = await db.collection(`teams/${teamId}/attendance`)
          .where("date", ">=", lastMonthStart.toISOString().split("T")[0])
          .where("date", "<=", lastMonthEnd.toISOString().split("T")[0])
          .limit(1)
          .get();

        const schedulesSnap = await db.collection(`teams/${teamId}/schedules`)
          .where("date", ">=", lastMonthStart.toISOString().split("T")[0])
          .where("date", "<=", lastMonthEnd.toISOString().split("T")[0])
          .limit(1)
          .get();

        // 🔥 활동 없으면 스킵
        if (attendanceSnap.empty && schedulesSnap.empty) {
          return;
        }

        try {
          // 🔥 월간 리포트 생성 (growth_report 타입)
          const post = await generateBlogPostContent(
            teamId, 
            teamData, 
            "growth_report", 
            "pro"
          );

          if (!post || !post.title || !post.content) {
            return;
          }

          const postRef = db.collection(`teams/${teamId}/blog_posts`).doc();
          await db.runTransaction(async (transaction) => {
            transaction.set(postRef, {
              ...post,
              status: "published",
              createdAt: FieldValue.serverTimestamp(),
              createdBy: "ai_auto",
              postType: "growth_report",
              publishedAt: FieldValue.serverTimestamp(),
              viewCount: 0,
              plan: "pro",
              teamId,
              monthKey,
              isAutoGenerated: true,
            });

            transaction.update(blogSettingsRef, {
              updatedAt: FieldValue.serverTimestamp(),
            });
          });

          createdPosts++;
          
          // 🔥 비용 카운터 증가
          await costLimitRef.set({
            monthlyLimit: costLimit.monthlyLimit,
            currentMonth: (costLimit.currentMonth || 0) + 1,
            resetDate: costLimit.resetDate || Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
            lastUpdated: FieldValue.serverTimestamp(),
          }, { merge: true });
        } catch (error) {
          logger.warn(`⚠️ [autoMonthlyTeamPost] 팀 ${teamId} 기록 생성 실패:`, {
            error: error instanceof Error ? error.message : String(error),
          });
          
          if (error instanceof Error && (
            error.message.includes("rate-limit") ||
            error.message.includes("temporary") ||
            error.message.includes("timeout")
          )) {
            throw error;
          }
        }
      });

      await Promise.all(blogPromises);
      
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      
      logger.info("✅ [MONTHLY_JOB] 월간 자동 기록 생성 완료", {
        timestamp: endTime.toISOString(),
        processedTeams,
        createdPosts,
        duration: `${duration.toFixed(2)}s`,
      });
    } catch (error) {
      logger.error("❌ [MONTHLY_JOB] 전체 작업 실패:", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      
      if (error instanceof Error && (
        error.message.includes("rate-limit") ||
        error.message.includes("temporary") ||
        error.message.includes("timeout")
      )) {
        throw error;
      }
    }
  }
);

