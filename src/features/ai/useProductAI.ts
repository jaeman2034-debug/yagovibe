import { useEffect, useState } from "react";

type MinimalProduct = {
  id?: string;
  name: string;
  images?: string[];
  imageUrl?: string | null;
};

async function fakeAIAnalyze(imageUrl: string | undefined, name: string) {
  const isSport = /(축구|농구|야구|러닝|풋살|헬스|운동|테니스|배드민턴|골프)/.test(name);
  return {
    aiCategory: isSport ? "스포츠 용품" : "일반 상품",
    aiCondition: "상태 양호",
    aiRecommendedPrice: Math.floor((Math.random() * 0.5 + 0.5) * 30000),
    aiSummary: isSport
      ? `${name}은(는) 스포츠 용품으로, 운동에 적합하며 사용감은 적당한 편입니다.`
      : `${name}은(는) 현재 상태가 무난한 중고 상품입니다.`,
  };
}

export function useProductAI(product: MinimalProduct | null) {
  const [loading, setLoading] = useState<boolean>(true);
  const [ai, setAi] = useState<{
    aiCategory: string;
    aiCondition: string;
    aiRecommendedPrice: number;
    aiSummary: string;
  } | null>(null);

  useEffect(() => {
    if (!product) return;
    setLoading(true);
    const firstImage = product.images?.[0] ?? (product.imageUrl ?? undefined);
    fakeAIAnalyze(firstImage, product.name).then((res) => {
      setAi(res);
      setLoading(false);
    });
  }, [product?.id, product?.name, product?.imageUrl, product?.images]);

  return { ai, loading };
}


