/**
 * CV-1 I7 J5 — cvGrowthLinks read (Callable only · client write forbidden)
 */
import { callGetCvGrowthLinksContext } from "@/lib/academy/academyCvCallables";
import type {
  CvGrowthLinkSnapshotDto,
  CvSignalDto,
} from "@/lib/academy/academyCvGrowthLinksTypes";

export type CvGrowthLinkSnapshot = CvGrowthLinkSnapshotDto;
export type CvSignal = CvSignalDto;

export type CvGrowthLinksContext = {
  latestLink: CvGrowthLinkSnapshot | null;
  signals: CvSignal[];
  history: CvGrowthLinkSnapshot[];
};

export async function loadCvGrowthLinksContext(
  teamId: string,
  mediaId: string
): Promise<CvGrowthLinksContext> {
  const res = await callGetCvGrowthLinksContext({ teamId, mediaId });
  return {
    latestLink: res.latestLink,
    signals: res.signals,
    history: res.history,
  };
}
