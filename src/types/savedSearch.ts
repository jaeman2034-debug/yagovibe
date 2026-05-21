/**
 * 저장된 검색 조건 (알림용)
 */
export interface SavedSearch {
  id?: string;
  userId: string;
  category: string | null;
  keywordTokens: string[];
  location: {
    lat: number;
    lng: number;
  } | null;
  radiusKm: number;
  intent?: {
    goodCondition?: boolean;
    directDeal?: boolean;
    cheap?: boolean;
  };
  enabled: boolean;
  createdAt: any; // Firestore Timestamp
  lastNotifiedAt?: any; // Firestore Timestamp (스팸 방지)
  notificationCount?: number; // 알림 발송 횟수
}

