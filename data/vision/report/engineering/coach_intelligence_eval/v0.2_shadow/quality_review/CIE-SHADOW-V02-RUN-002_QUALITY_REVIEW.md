# CIE Shadow Quality Review — CIE-SHADOW-V02-RUN-002
**Layer:** advisory / NON-GATING  
**Judge used:** Y — gpt-4o-mini  
**Prompt changed:** N · **CIE hard gate:** unchanged  

## Means

- Q01: **1.2**
- Q02: **1.3**
- Q03: **1.2**
- Q04: **1.2**

## Diversity

- unique opening ratio: **0.100**
- unique closing ratio: **0.700**
- repeated sentence ratio: **0.143**
- mean pairwise Jaccard: **0.2961**
- top opening: `('패스 연결 <NUM>건이 확인되었습니다. p<NUM', 19)`
- top recommendation: `[('위험 지역 안전 옵션 리허설', 16), ('볼 순환', 7), ('받기 전 스캔', 2)]`

## Low quality

- zero on any Q01–Q04: []
- total Q01–Q04 ≤ 4: ['CIE-SHADOW-V02-001', 'CIE-SHADOW-V02-002', 'CIE-SHADOW-V02-005', 'CIE-SHADOW-V02-006', 'CIE-SHADOW-V02-007', 'CIE-SHADOW-V02-008', 'CIE-SHADOW-V02-010', 'CIE-SHADOW-V02-011', 'CIE-SHADOW-V02-013', 'CIE-SHADOW-V02-014', 'CIE-SHADOW-V02-015', 'CIE-SHADOW-V02-016', 'CIE-SHADOW-V02-019', 'CIE-SHADOW-V02-020']

## Top 3 measurable prompt weaknesses

1. **excessive_fixed_opening** — `{"uniqueOpeningRatio": 0.1, "topOpening": ["패스 연결 <NUM>건이 확인되었습니다. p<NUM", 19]}`
2. **generic_or_repeated_recommendation_phrase** — `{"meanQ04": 1.2, "topRecommendation": [["위험 지역 안전 옵션 리허설", 16], ["볼 순환", 7], ["받기 전 스캔", 2]]}`
3. **weak_use_of_numeric_or_player_evidence** — `{"meanQ01": 1.2}`

## Note

Do not create cip-v0.2.0 until PM authorizes evidence-based correction.
