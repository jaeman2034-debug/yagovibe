/**
 * 즐겨찾기 관리 Context Provider
 * 
 * 팀과 선수를 즐겨찾기로 추가/제거하는 기능을 제공합니다.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface FavoritesContextValue {
  teams: string[];
  players: string[];
  addTeam: (team: string) => void;
  removeTeam: (team: string) => void;
  addPlayer: (player: string) => void;
  removePlayer: (player: string) => void;
  isTeamFavorite: (team: string) => boolean;
  isPlayerFavorite: (player: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  teams: [],
  players: [],
  addTeam: () => {},
  removeTeam: () => {},
  addPlayer: () => {},
  removePlayer: () => {},
  isTeamFavorite: () => false,
  isPlayerFavorite: () => false,
});

export const useFavorites = () => useContext(FavoritesContext);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<string[]>([]);
  const [players, setPlayers] = useState<string[]>([]);

  const addTeam = useCallback((team: string) => {
    setTeams((prev) => {
      if (prev.includes(team)) {
        console.log(`⚠️ [Favorites] ${team} 팀은 이미 즐겨찾기에 있습니다.`);
        return prev;
      }
      console.log(`✅ [Favorites] ${team} 팀을 즐겨찾기에 추가했습니다.`);
      return [...prev, team];
    });
  }, []);

  const removeTeam = useCallback((team: string) => {
    setTeams((prev) => {
      if (!prev.includes(team)) {
        console.log(`⚠️ [Favorites] ${team} 팀은 즐겨찾기에 없습니다.`);
        return prev;
      }
      console.log(`✅ [Favorites] ${team} 팀을 즐겨찾기에서 제거했습니다.`);
      return prev.filter((t) => t !== team);
    });
  }, []);

  const addPlayer = useCallback((player: string) => {
    setPlayers((prev) => {
      if (prev.includes(player)) {
        console.log(`⚠️ [Favorites] ${player} 선수는 이미 즐겨찾기에 있습니다.`);
        return prev;
      }
      console.log(`✅ [Favorites] ${player} 선수를 즐겨찾기에 추가했습니다.`);
      return [...prev, player];
    });
  }, []);

  const removePlayer = useCallback((player: string) => {
    setPlayers((prev) => {
      if (!prev.includes(player)) {
        console.log(`⚠️ [Favorites] ${player} 선수는 즐겨찾기에 없습니다.`);
        return prev;
      }
      console.log(`✅ [Favorites] ${player} 선수를 즐겨찾기에서 제거했습니다.`);
      return prev.filter((p) => p !== player);
    });
  }, []);

  const isTeamFavorite = useCallback(
    (team: string) => teams.includes(team),
    [teams]
  );

  const isPlayerFavorite = useCallback(
    (player: string) => players.includes(player),
    [players]
  );

  return (
    <FavoritesContext.Provider
      value={{
        teams,
        players,
        addTeam,
        removeTeam,
        addPlayer,
        removePlayer,
        isTeamFavorite,
        isPlayerFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

