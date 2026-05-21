/**
 * 실제 대진표 데이터를 Firestore에 시드하는 스크립트
 * 관리자 페이지에서 실행 가능
 */

import { seedBracketData } from "./seedBracketData";
import { generateRealBrackets } from "./realBracketData";

/**
 * 실제 대진표 데이터를 Firestore에 저장
 */
export async function seedRealBracketsToFirestore(
  associationId: string,
  tournamentId: string
): Promise<void> {
  const brackets = generateRealBrackets();
  await seedBracketData(associationId, tournamentId, brackets);
}

