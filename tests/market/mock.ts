/**
 * 🔥 매칭 테스트 Mock 데이터
 */

export const mockPost = {
  id: "post_123",
  title: "저녁 러닝",
  authorId: "author_123",
  people: 3,
  currentPeople: 2,
  fee: 5000,
  images: [],
  location: "서울시 강남구",
  category: "러닝",
  createdAt: new Date(),
};

export const mockJoin = (status: string, reason?: string) => ({
  postId: "post_123",
  userId: "userA",
  status,
  rejectedReason: reason,
  createdAt: new Date(),
  postAuthorId: "author_123",
});

export const mockUser = {
  uid: "userA",
  displayName: "테스트 유저",
  email: "test@example.com",
};

export const mockChatRoom = {
  id: "room_123",
  productId: "post_123",
  buyerId: "userA",
  sellerId: "author_123",
};
