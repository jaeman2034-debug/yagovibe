/**
 * 🔥 G-④: AI 분석 결과 요약 생성 시스템
 * 
 * AI의 원시 응답을 사용자가 3초 안에 이해할 수 있는 요약으로 변환합니다.
 * 
 * 원칙:
 * - 결론 → 근거 → 세부 순서
 * - 1줄 결론 (20자 내외)
 * - 핵심 포인트 2~3개
 * - 판단형 문장 (서술 ❌)
 */

import { ConfidenceResult } from "@/lib/analytics/confidenceCalculator";

export interface AISummary {
  headline: string; // 1줄 결론 (20자 내외, 판단형)
  highlights: string[]; // 핵심 포인트 2~3개
}

export interface AISummaryInput {
  // AI 응답 원시 데이터 (analyzeProduct 엔드포인트 응답 구조)
  title?: string;
  price_suggestion?: {
    low?: number;
    high?: number;
    avg?: number;
  };
  category?: {
    major?: string;
    minor?: string;
  };
  brand?: string;
  condition?: string;
  description?: string;
  tags?: string[];
  attributes?: Array<Record<string, any>> | Record<string, any>;
  // voiceVisionAddProduct 응답 구조 (호환성)
  product?: {
    name?: string;
    price?: string | number;
    category?: string;
    desc?: string;
  };
  // 신뢰도 정보
  confidence: ConfidenceResult;
}

/**
 * AI 분석 결과를 요약으로 변환합니다.
 * 
 * @param input AI 응답 원시 데이터 + 신뢰도
 * @returns 사용자 친화적 요약
 */
export function generateAISummary(input: AISummaryInput): AISummary {
  const { product, price_suggestion, category, confidence } = input;

  // 🔥 UNAVAILABLE: 분석 실패 시
  if (confidence.level === 'UNAVAILABLE') {
    return {
      headline: '분석에 필요한 정보가 부족합니다.',
      highlights: [
        '이미지나 상품 정보를 다시 확인해주세요',
        '외부 브라우저에서 다시 시도해보세요',
      ],
    };
  }

  // 🔥 LOW 신뢰도: 참고용 톤
  const isLowConfidence = confidence.level === 'LOW';
  const toneSuffix = isLowConfidence ? '로 추정됩니다' : '으로 판단됩니다';
  const referencePrefix = isLowConfidence ? '참고: ' : '';

  // 1. 1줄 결론 생성 (가격 중심)
  let headline = '';
  
  if (price_suggestion) {
    const { low, high, avg } = price_suggestion;
    const productPrice = product?.price 
      ? typeof product.price === 'string' 
        ? parseFloat(product.price.replace(/[^\d.-]/g, ''))
        : product.price
      : null;

    if (productPrice && avg) {
      const diff = ((productPrice - avg) / avg) * 100;
      const diffAbs = Math.abs(diff);

      if (diffAbs <= 5) {
        headline = `이 상품은 정상 범위의 가격${toneSuffix}`;
      } else if (diff > 5) {
        headline = `가격 대비 고평가 가능성${toneSuffix}`;
      } else {
        headline = `가격 대비 저평가 가능성${toneSuffix}`;
      }
    } else if (avg) {
      headline = `추천 가격: ${avg.toLocaleString()}원${toneSuffix}`;
    } else if (low && high) {
      const midPrice = Math.round((low + high) / 2);
      headline = `추천 가격 범위: ${low.toLocaleString()}원 ~ ${high.toLocaleString()}원${toneSuffix}`;
    } else {
      headline = `가격 정보를 확인했습니다${toneSuffix}`;
    }
  } else if (product?.price) {
    headline = `상품 가격: ${typeof product.price === 'string' ? product.price : product.price.toLocaleString()}원${toneSuffix}`;
  } else {
    headline = `상품 정보를 분석했습니다${toneSuffix}`;
  }

  // LOW 신뢰도일 때 참고용 접두사 추가
  if (isLowConfidence) {
    headline = `${referencePrefix}${headline}`;
  }

  // 2. 핵심 포인트 생성 (최대 3개)
  const highlights: string[] = [];

  // 포인트 1: 가격 비교 정보
  if (price_suggestion && price_suggestion.avg) {
    const productPrice = product?.price 
      ? typeof product.price === 'string' 
        ? parseFloat(product.price.replace(/[^\d.-]/g, ''))
        : product.price
      : null;

    if (productPrice) {
      const diff = ((productPrice - price_suggestion.avg) / price_suggestion.avg) * 100;
      const diffAbs = Math.abs(diff);
      
      if (diffAbs <= 5) {
        highlights.push(`동일 카테고리 평균 대비 ±5% 이내`);
      } else {
        highlights.push(`동일 카테고리 평균 대비 ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`);
      }
    } else {
      highlights.push(`추천 가격: ${price_suggestion.avg.toLocaleString()}원`);
    }
  }

  // 포인트 2: 카테고리 정보
  const categoryName = category?.minor || category?.major || product?.category || '';
  if (categoryName) {
    highlights.push(`카테고리: ${categoryName}`);
  }

  // 포인트 3: 데이터 기반 정보 (신뢰도 기반)
  if (confidence.level === 'HIGH') {
    highlights.push(`충분한 비교 데이터 확보`);
  } else if (confidence.level === 'MEDIUM') {
    highlights.push(`제한된 데이터 기반 분석`);
  }

  // 포인트 4: 이미지 품질 또는 상태 (있는 경우)
  if (input.condition) {
    const conditionText = input.condition === '상' ? '상태 양호' 
      : input.condition === '중' ? '상태 보통'
      : input.condition === '하' ? '상태 주의'
      : `상태: ${input.condition}`;
    highlights.push(conditionText);
  } else if (input.attributes) {
    // attributes가 배열인 경우
    if (Array.isArray(input.attributes)) {
      const qualityAttr = input.attributes.find((attr: any) => 
        attr.name === 'imageQuality' || attr.name === 'condition'
      );
      if (qualityAttr?.value === 'good' || qualityAttr?.value === '상') {
        highlights.push(`이미지 품질 양호`);
      }
    } else if (typeof input.attributes === 'object') {
      // attributes가 객체인 경우
      const quality = (input.attributes as any).imageQuality || (input.attributes as any).condition;
      if (quality === 'good' || quality === '상') {
        highlights.push(`이미지 품질 양호`);
      }
    }
  }

  // 최대 3개로 제한
  const finalHighlights = highlights.slice(0, 3);

  // 최소 2개 보장 (부족하면 기본 메시지 추가)
  if (finalHighlights.length < 2) {
    const productName = product?.name || title || '상품';
    if (finalHighlights.length === 0) {
      finalHighlights.push(`${productName} 정보 확인 완료`);
      finalHighlights.push(`상세 정보는 아래를 확인해주세요`);
    } else {
      finalHighlights.push(`상품 정보 분석 완료`);
    }
  }

  return {
    headline,
    highlights: finalHighlights,
  };
}

/**
 * AI 응답 데이터를 AISummaryInput으로 변환합니다.
 * (MarketAddPage의 실제 응답 구조와 호환)
 */
/**
 * AI 응답 데이터를 AISummaryInput으로 변환합니다.
 * (MarketAddPage의 실제 응답 구조와 호환)
 * 
 * @param aiResponse analyzeProduct 또는 voiceVisionAddProduct 응답
 * @param confidence 신뢰도 계산 결과
 */
export function convertAIResponseToSummaryInput(
  aiResponse: any,
  confidence: ConfidenceResult
): AISummaryInput {
  // voiceVisionAddProduct 응답 구조 (product 객체 포함)
  if (aiResponse.product) {
    return {
      product: aiResponse.product,
      title: aiResponse.product.name,
      price_suggestion: aiResponse.product.price 
        ? {
            avg: typeof aiResponse.product.price === 'string'
              ? parseFloat(aiResponse.product.price.replace(/[^\d.-]/g, ''))
              : aiResponse.product.price,
          }
        : undefined,
      category: aiResponse.product.category
        ? { minor: aiResponse.product.category }
        : undefined,
      description: aiResponse.product.desc || aiResponse.product.description,
      tags: aiResponse.product.aiTags || aiResponse.product.tags,
      confidence,
    };
  }

  // analyzeProduct 응답 구조 (직접 필드)
  return {
    title: aiResponse.title,
    price_suggestion: aiResponse.price_suggestion,
    category: aiResponse.category,
    brand: aiResponse.brand,
    condition: aiResponse.condition,
    description: aiResponse.description,
    tags: aiResponse.tags,
    attributes: aiResponse.attributes,
    confidence,
  };
}

