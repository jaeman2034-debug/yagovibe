/**
 * 🔥 관리자 로그 뷰 타입 정의
 * Step 3: 관리자 로그 뷰 (Audit / Timeline)
 */

export type AuditLog =
  | {
      type: "CHECKIN";
      at: Date;
      actorId: string;
      playerId: string;
      method?: "QR" | "MANUAL";
    }
  | {
      type: "CARD";
      at: Date;
      actorId: string;
      playerId: string;
      cardType: "YELLOW" | "RED";
      minute: number;
    }
  | {
      type: "MEMO";
      at: Date;
      actorId: string;
      text: string;
    };

