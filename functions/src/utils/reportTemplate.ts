/**
 * AI 주간 리포트 생성 프롬프트 템플릿
 */
export interface UserProfile {
    uid: string;
    nickname: string;
    favoriteSports?: string[];
}

export interface Activity {
    date: string;
    activity: string;
    duration: number;
    type?: string;
}

export interface UserReportData extends UserProfile {
    activities?: Activity[];
}

/**
 * 사용자 데이터를 기반으로 AI 리포트 생성 프롬프트 생성
 */
export const generateReportPrompt = (userData: UserReportData): string => {
    const activitiesText = userData.activities && userData.activities.length > 0
        ? userData.activities.map(
            (a) => `날짜: ${a.date}, 활동: ${a.activity}, 시간: ${a.duration}분${a.type ? `, 종류: ${a.type}` : ""}`
        ).join("\n")
        : "지난 주 활동 기록이 없습니다.";

    return `
당신은 스포츠 코치입니다.
아래는 사용자의 지난주 활동 기록입니다.
이 데이터를 분석하여 주간 요약 리포트를 작성하세요.

[사용자 정보]
닉네임: ${userData.nickname}
선호 종목: ${userData.favoriteSports?.join(", ") || "없음"}

[활동 데이터]
${activitiesText}

출력은 다음 형식으로 제공:
---
1. 주간 요약 (150자 내외)
2. 피드백 (100자 내외)
3. 추천 목표 (50자 내외)
---

한국어로 작성해주세요.
`;
};

