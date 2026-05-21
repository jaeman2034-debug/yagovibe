/**
 * 협회 AI Callable 얇은 래퍼 — federation *.impl은 배포/에뮬 코드 로드 시 정적 로드하지 않음.
 */
import { onCall } from "firebase-functions/v2/https";

const federationCallableOpts = {
  region: "asia-northeast3" as const,
  secrets: ["OPENAI_API_KEY"],
};

export const generateFederationAIContent = onCall(federationCallableOpts, async (request) => {
  const { handleGenerateFederationAIContent } = await import("./federation/generateFederationAIContent.impl");
  return handleGenerateFederationAIContent(request);
});

export const generateFederationIntroMessage = onCall(federationCallableOpts, async (request) => {
  const { handleGenerateFederationIntroMessage } = await import("./federation/generateFederationIntroMessage.impl");
  return handleGenerateFederationIntroMessage(request);
});

export const generateFederationHistory = onCall(federationCallableOpts, async (request) => {
  const { handleGenerateFederationHistory } = await import("./federation/generateFederationHistory.impl");
  return handleGenerateFederationHistory(request);
});

export const generateFederationOrganization = onCall(federationCallableOpts, async (request) => {
  const { handleGenerateFederationOrganization } = await import("./federation/generateFederationOrganization.impl");
  return handleGenerateFederationOrganization(request);
});

export const refineFederationHistory = onCall(federationCallableOpts, async (request) => {
  const { handleRefineFederationHistory } = await import("./federation/refineFederationHistory.impl");
  return handleRefineFederationHistory(request);
});

/**
 * MVP: 통합 입력으로 협회 섹션 5종 자동 생성
 */
export const generateFederationFromSources = onCall(federationCallableOpts, async (request) => {
  const { handleGenerateFederationFromSources } = await import("./federation/generateFederationFromSources.impl");
  return handleGenerateFederationFromSources(request);
});

/**
 * OCR 전용: 이미지 URL 배열에서 텍스트만 추출
 */
export const extractTextFromImages = onCall(federationCallableOpts, async (request) => {
  const { handleExtractTextFromImages } = await import("./federation/extractTextFromImages.impl");
  return handleExtractTextFromImages(request);
});
