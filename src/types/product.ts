import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import type { MarketProduct } from "./market";
import { parseMarketProduct } from "./market";

export type Product = MarketProduct & {
  createdAt: Date | null;
};

export const parseProduct = (
  doc: QueryDocumentSnapshot<DocumentData>
): Product => {
  const base = parseMarketProduct(doc);
  const rawCreatedAt = base.createdAt;

  const createdAt =
    rawCreatedAt?.toDate?.() ??
    (rawCreatedAt instanceof Date ? rawCreatedAt : null);

  return {
    ...base,
    name: base.name || "상품명 없음",
    price: typeof base.price === "number" ? base.price : 0,
    imageUrl: base.imageUrl ?? "",
    location: base.location ?? "위치 정보 없음",
    createdAt,
  };
};


