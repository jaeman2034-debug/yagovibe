import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Firestore rules `tradeTwoPartyThreadMemberIdsValid` 와 동일한 2인 정렬 키 */
export function sortedTradeThreadMemberIds(sellerId: string, buyerId: string): string[] | null {
  const s = String(sellerId ?? "").trim();
  const b = String(buyerId ?? "").trim();
  if (!s || !b || s === b) return null;
  return s <= b ? [s, b] : [b, s];
}

/** chats 문서에서 seller/buyer 우선, 없으면 participants 에서 2명 추출 */
export async function fetchTradeThreadMemberIdsForChat(chatId: string): Promise<string[] | null> {
  const cid = String(chatId ?? "").trim();
  if (!cid) return null;
  const snap = await getDoc(doc(db, "chats", cid));
  if (!snap.exists()) return null;
  const d = snap.data() as Record<string, unknown>;
  const sellerRaw = d.sellerId;
  const buyerRaw = d.buyerId;
  const seller = typeof sellerRaw === "string" ? sellerRaw.trim() : String(sellerRaw ?? "").trim();
  const buyer = typeof buyerRaw === "string" ? buyerRaw.trim() : String(buyerRaw ?? "").trim();
  if (seller && buyer && seller !== buyer) {
    return sortedTradeThreadMemberIds(seller, buyer);
  }
  const parts = Array.isArray(d.participants)
    ? [...new Set(d.participants.map((x) => String(x ?? "").trim()).filter(Boolean))]
    : [];
  if (parts.length === 2) {
    return sortedTradeThreadMemberIds(parts[0]!, parts[1]!);
  }
  return null;
}
