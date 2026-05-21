import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** 미읽음 전체 — `getCountFromServer` / `onSnapshot` 공통 쿼리 (limit 없음) */
export function unreadNotificationsQuery(userId: string) {
  return query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("isRead", "==", false)
  );
}
