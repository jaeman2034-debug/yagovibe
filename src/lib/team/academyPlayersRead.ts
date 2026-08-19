import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AcademyPlayerRow } from "@/lib/team/academyPlayersTypes";

export async function readAcademyPlayers(teamId: string): Promise<AcademyPlayerRow[]> {
  if (!teamId.trim()) return [];
  const col = collection(db, "teams", teamId, "academyPlayers");
  const snap = await getDocs(query(col, where("status", "==", "active")));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      playerId: String(data.playerId ?? d.id),
      displayName: String(data.displayName ?? "이름없음"),
      birthDate: (data.birthDate as string | null | undefined) ?? null,
      uniformNumber: (data.uniformNumber as string | number | null | undefined) ?? null,
      position: (data.position as string | null | undefined) ?? null,
      status: (data.status as "active" | "archived") ?? "active",
    };
  });
}
