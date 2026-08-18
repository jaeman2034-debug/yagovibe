/** Sprint E-2.1 — Coach Action Center */

export type CoachActionItem = {
  id: string;
  priority: number;
  emoji: string;
  title: string;
  detail: string;
  playerNames?: string[];
};

export type CoachActionCenterResult = {
  headline: string;
  subline: string | null;
  actions: CoachActionItem[];
};
