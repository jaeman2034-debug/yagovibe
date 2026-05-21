/**
 * 🔥 Story API Contract - 타입 중심 계약서
 * 
 * Node.js (Firebase Functions / Express) 기준
 */

import type { Story } from "./story.types";
import type { StoryAdminFilter } from "./story.admin.types";

// ============================================================================
// API Request/Response Types
// ============================================================================

// ============================================================================
// GET /api/stories (Public)
// ============================================================================
export interface GetStoriesRequest {
  sportType?: string;
  region?: string;
  limit?: number;
}

export interface GetStoriesResponse {
  stories: Story[];
  mode: "default" | "season";
  serverTime: string; // ISO string
  total: number;
  hasMore: boolean;
}

// ============================================================================
// POST /api/stories (Admin)
// ============================================================================
export interface CreateStoryRequest {
  title: string;
  subtitle: string;
  category: Story["category"];
  source: Story["source"];
  
  // 스케줄 (기본 7일)
  startAt?: string;  // ISO string
  endAt?: string;    // ISO string
  
  priority?: number;
  score?: number;
  isVerifiedAuthor?: boolean;
  
  ctaType?: Story["ctaType"];
  imageUrl?: string;
  metadata?: {
    [key: string]: any;
  };
  
  createdBy: string; // uid
}

export interface CreateStoryResponse {
  id: string;
}

// ============================================================================
// PATCH /api/stories/:id (Admin)
// ============================================================================
export interface UpdateStoryRequest extends Partial<CreateStoryRequest> {
  status?: Story["status"];
  updatedBy: string; // uid
}

export interface UpdateStoryResponse {
  story: Story;
}

// PATCH /api/stories/:id/priority (Admin)
export interface UpdatePriorityRequest {
  priority: number;
  updatedBy: string;
}

export interface UpdatePriorityResponse {
  id: string;
  priority: number;
}

// DELETE /api/stories/:id (Admin)
export interface DeleteStoryResponse {
  id: string;
  deleted: boolean;
}

// GET /api/stories/admin (Admin)
export interface GetAdminStoriesRequest extends StoryAdminFilter {}

export interface GetAdminStoriesResponse {
  stories: Story[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// 에러 코드 상수
export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

// ============================================================================
// API Client Interface (프론트엔드용)
// ============================================================================

export interface StoryApiClient {
  // Public APIs
  getStories(params: GetStoriesRequest): Promise<GetStoriesResponse>;
  
  // Admin APIs
  createStory(data: CreateStoryRequest): Promise<CreateStoryResponse>;
  updateStory(id: string, data: UpdateStoryRequest): Promise<UpdateStoryResponse>;
  updatePriority(id: string, data: UpdatePriorityRequest): Promise<UpdatePriorityResponse>;
  deleteStory(id: string): Promise<DeleteStoryResponse>;
  getAdminStories(params: GetAdminStoriesRequest): Promise<GetAdminStoriesResponse>;
}
