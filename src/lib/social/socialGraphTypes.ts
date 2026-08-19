/** Client mirror — TRACK 6A.1 social graph */

export type SocialPlayerSnippetClient = {
  uid: string;
  displayName: string;
  seasonRank: string | null;
  archetype: string;
  isFollowing?: boolean;
  isFollower?: boolean;
  isMutual?: boolean;
};

export type FriendsGraphClient = {
  following: SocialPlayerSnippetClient[];
  followers: SocialPlayerSnippetClient[];
  mutuals: SocialPlayerSnippetClient[];
  meta: {
    followingCount: number;
    followersCount: number;
    mutualCount: number;
  };
};
