import type { BuiltStory, } from "./buildPublicMatchStoryProjection";

export type StoryPatch = { publicStoryEvents: BuiltStory["publicStoryEvents"]; storyRevision: string };
export function planStoryPatch(existing: Record<string, unknown> | null, built: BuiltStory): StoryPatch | null {
  if (!existing) return null;
  if (existing.storyRevision === built.storyRevision) return null;
  if (existing.storyRevision == null && JSON.stringify(existing.publicStoryEvents ?? []) === JSON.stringify(built.publicStoryEvents)) return null;
  return { publicStoryEvents: built.publicStoryEvents, storyRevision: built.storyRevision };
}
