# CIE Shadow Quality Review — CIE-SHADOW-V02-RUN-001
**Layer:** advisory / NON-GATING  
**Judge used:** Y — gpt-4o-mini  
**Prompt changed:** N · **CIE hard gate:** unchanged  

## Means

- Q01: **1.25**
- Q02: **1.3**
- Q03: **1.25**
- Q04: **1.25**

## Diversity

- unique opening ratio: **0.100**
- unique closing ratio: **0.250**
- repeated sentence ratio: **0.400**
- mean pairwise Jaccard: **0.5331**
- top opening: `('패스 연결 <NUM>건이 확인되었습니다. 다음 훈련', 15)`
- top recommendation: `[('압박 하 짧은 지원 패스', 20), ('위험 지역 안전 옵션 리허설', 18), ('볼 순환', 4)]`

## Low quality

- zero on any Q01–Q04: []
- total Q01–Q04 ≤ 4: ['CIE-SHADOW-V02-002', 'CIE-SHADOW-V02-005', 'CIE-SHADOW-V02-006', 'CIE-SHADOW-V02-007', 'CIE-SHADOW-V02-008', 'CIE-SHADOW-V02-009', 'CIE-SHADOW-V02-010', 'CIE-SHADOW-V02-011', 'CIE-SHADOW-V02-012', 'CIE-SHADOW-V02-013', 'CIE-SHADOW-V02-014', 'CIE-SHADOW-V02-015', 'CIE-SHADOW-V02-019', 'CIE-SHADOW-V02-020']

## Top 3 measurable prompt weaknesses

1. **excessive_fixed_opening** — `{"uniqueOpeningRatio": 0.1, "topOpening": ["패스 연결 <NUM>건이 확인되었습니다. 다음 훈련", 15]}`
2. **excessive_fixed_closing_skeleton** — `{"uniqueClosingRatio": 0.25, "note": "HITL required closing excluded from quality failure but skeleton still highly repeated", "topClosing": ["험 지역 안전 옵션 리허설을 진행하는 것이 좋습니다. <HITL>", 10]}`
3. **generic_or_repeated_recommendation_phrase** — `{"meanQ04": 1.25, "topRecommendation": [["압박 하 짧은 지원 패스", 20], ["위험 지역 안전 옵션 리허설", 18], ["볼 순환", 4]]}`

## Note

Do not create cip-v0.2.0 until PM authorizes evidence-based correction.
