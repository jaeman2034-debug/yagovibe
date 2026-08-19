export type AcademyPlayerRow = {
  playerId: string;
  displayName: string;
  birthDate?: string | null;
  uniformNumber?: string | number | null;
  position?: string | null;
  status: "active" | "archived";
};
