/**
 * 🔥 Story API Client - 백엔드 연동 클라이언트
 */

import type {
  GetStoriesRequest,
  GetStoriesResponse,
  CreateStoryRequest,
  CreateStoryResponse,
  UpdateStoryRequest,
  UpdateStoryResponse,
  DeleteStoryResponse,
  GetAdminStoriesRequest,
  GetAdminStoriesResponse,
  StoryApiClient,
} from "../domain/story.api.contract";
import type { Story } from "../domain/story.types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

/**
 * Story API 클라이언트 구현
 */
export class StoryApiClientImpl implements StoryApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        code: "UNKNOWN_ERROR",
        message: response.statusText,
      }));
      throw new Error(error.message || "API 요청 실패");
    }

    return response.json();
  }

  /**
   * GET /api/stories - 공개 스토리 조회
   */
  async getStories(
    params: GetStoriesRequest = {}
  ): Promise<GetStoriesResponse> {
    const query = new URLSearchParams();
    if (params.sportType) query.set("sportType", params.sportType);
    if (params.region) query.set("region", params.region);
    if (params.limit) query.set("limit", String(params.limit));

    const endpoint = `/stories${query.toString() ? `?${query}` : ""}`;
    return this.request<GetStoriesResponse>(endpoint);
  }

  /**
   * POST /api/stories - 스토리 생성 (Admin)
   */
  async createStory(data: CreateStoryRequest): Promise<CreateStoryResponse> {
    return this.request<CreateStoryResponse>("/stories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH /api/stories/:id - 스토리 수정 (Admin)
   */
  async updateStory(
    id: string,
    data: UpdateStoryRequest
  ): Promise<UpdateStoryResponse> {
    return this.request<UpdateStoryResponse>(`/stories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH /api/stories/:id/priority - 우선순위 수정 (Admin)
   */
  async updatePriority(
    id: string,
    data: { priority: number; updatedBy: string }
  ): Promise<{ id: string; priority: number }> {
    return this.request<{ id: string; priority: number }>(
      `/stories/${id}/priority`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * DELETE /api/stories/:id - 스토리 삭제 (Admin)
   */
  async deleteStory(id: string): Promise<DeleteStoryResponse> {
    return this.request<DeleteStoryResponse>(`/stories/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * GET /api/stories/admin - 관리자용 스토리 목록
   */
  async getAdminStories(
    params: GetAdminStoriesRequest = {}
  ): Promise<GetAdminStoriesResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.source) query.set("source", params.source);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const endpoint = `/stories/admin${query.toString() ? `?${query}` : ""}`;
    return this.request<GetAdminStoriesResponse>(endpoint);
  }
}

// 싱글톤 인스턴스
export const storyApi = new StoryApiClientImpl();
