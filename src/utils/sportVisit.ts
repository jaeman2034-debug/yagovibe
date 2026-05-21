const SPORT_HUB_VISITED_KEY = "sportHubVisited";

export function isFirstSportHubVisit(): boolean {
  try {
    return localStorage.getItem(SPORT_HUB_VISITED_KEY) !== "true";
  } catch {
    return true;
  }
}

export function markSportHubVisited(): void {
  try {
    localStorage.setItem(SPORT_HUB_VISITED_KEY, "true");
  } catch {
    // ignore localStorage write failures
  }
}
