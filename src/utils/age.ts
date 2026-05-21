export function getAgeGroupFromBirthYear(birthYear?: number | null): string | null {
  if (birthYear == null || !Number.isFinite(birthYear)) return null;
  const y = Math.trunc(birthYear);
  if (y < 1900) return null;
  const nowYear = new Date().getFullYear();
  if (y > nowYear) return null;

  const age = nowYear - y;
  const ageGroup = Math.floor(age / 10) * 10;
  if (!Number.isFinite(ageGroup) || ageGroup < 0) return null;
  return `${ageGroup}대`;
}

