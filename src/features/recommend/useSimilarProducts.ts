import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AIProduct = {
  id: string;
  name: string;
  imageUrl?: string | null;
  aiLabels?: string[];
  category?: string | null;
};

export function useSimilarProducts(target: AIProduct | null, take = 10) {
  const [items, setItems] = useState<AIProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!target || !target.aiLabels?.length) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const q = query(
          collection(db, "marketProducts"),
          where("aiLabels", "array-contains-any", target.aiLabels.slice(0, 10)),
          limit(take + 5)
        );

        const snap = await getDocs(q);
        const all = snap.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
          .filter((item) => item.id !== target.id);

        const intersectScore = (a: string[], b: string[]) =>
          a.filter((label) => b.includes(label)).length;

        const scored = all
          .map((product) => ({
            ...product,
            _score: intersectScore(target.aiLabels!, (product.aiLabels || []) as string[]),
          }))
          .filter((product) => product._score > 0)
          .sort((a, b) => b._score - a._score)
          .slice(0, take);

        setItems(scored);
      } finally {
        setLoading(false);
      }
    })();
  }, [target?.id, JSON.stringify(target?.aiLabels), take]);

  return { items, loading };
}

