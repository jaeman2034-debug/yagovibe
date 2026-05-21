/**
 * 🔥 Domain Types - 계약 단일 소스
 * 
 * Week1~2 API Stub 기준
 */

export type Region = "seoul" | "busan" | "daegu" | "incheon" | "gwangju" | "daejeon" | "ulsan" | "gyeonggi" | "gangwon" | "jeju";
export type Mode = "default" | "season";

export type StorySource = "운영" | "협회" | "사용자";
export type StoryCategory = "대회" | "모집" | "협회" | "마켓" | "구장";
export type StoryStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "EXPIRED" | "REJECTED";

export type StoryCtaType =
  | "view_schedule"
  | "find_team"
  | "view_notice"
  | "browse_market"
  | "book_ground";

export type Story = {
  id: string;
  region: Region;

  source: StorySource;
  category: StoryCategory;

  title: string;     // <=40
  subtitle: string;  // <=60

  status: StoryStatus;
  startAt: string;   // ISO
  endAt: string;     // ISO

  ctaType?: StoryCtaType;
  priority?: number;         // 0~100
  score?: number;            // UGC popularity
  isVerifiedAuthor?: boolean;

  createdAt: string;
  updatedAt: string;
};

export type GetStoriesRes = {
  stories: Story[];
  mode: Mode;
  decisionReason: string;
  serverTime: string;
};

export type CreateStoryReq = {
  region: Region;
  title: string;
  subtitle: string;
  category: StoryCategory;
  source: StorySource;

  startAt?: string;
  endAt?: string;

  ctaType?: StoryCtaType;
  priority?: number;
  score?: number;
  isVerifiedAuthor?: boolean;

  status?: StoryStatus; // ADMIN/ASSOC only (stub에서는 허용)
};

export type LeagueInfo = {
  id: string;
  region: Region;
  name: string;
  startAt: string;
  endAt: string;
};
