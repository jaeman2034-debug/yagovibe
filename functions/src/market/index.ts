/**
 * 마켓 도메인 Cloud Functions
 * - 모집 참여 상태, 게시물 생성/수정, 채팅방→랭킹 갱신
 */

export { onMarketJoinStatusChanged } from "./onMarketJoinStatusChanged";
export { onMarketPostCreated, onMarketPostUpdated } from "./integratedPostProcessor";
