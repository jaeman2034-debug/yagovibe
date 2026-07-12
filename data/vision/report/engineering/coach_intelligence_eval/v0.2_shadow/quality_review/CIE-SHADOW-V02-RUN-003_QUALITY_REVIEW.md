# CIE Shadow Quality Review — CIE-SHADOW-V02-RUN-003
**Layer:** advisory / NON-GATING  
**Judge used:** Y — gpt-4o-mini  
**Prompt changed:** N · **CIE hard gate:** unchanged  

## Means

- Q01: **0.9**
- Q02: **1.0**
- Q03: **1.0**
- Q04: **1.0**

## Diversity

- unique opening ratio: **0.100**
- unique closing ratio: **0.650**
- repeated sentence ratio: **0.229**
- mean pairwise Jaccard: **0.2451**
- top opening: `('패스 연결 <NUM>건이 확인되었습니다. p<NUM', 19)`
- top recommendation: `[('위험 지역 안전 옵션 리허설', 6), ('볼 순환', 3), ('받기 전 스캔', 2)]`

## Low quality

- zero on any Q01–Q04: ['CIE-SHADOW-V02-007', 'CIE-SHADOW-V02-013']
- total Q01–Q04 ≤ 4: ['CIE-SHADOW-V02-001', 'CIE-SHADOW-V02-002', 'CIE-SHADOW-V02-003', 'CIE-SHADOW-V02-004', 'CIE-SHADOW-V02-005', 'CIE-SHADOW-V02-006', 'CIE-SHADOW-V02-007', 'CIE-SHADOW-V02-008', 'CIE-SHADOW-V02-009', 'CIE-SHADOW-V02-010', 'CIE-SHADOW-V02-011', 'CIE-SHADOW-V02-012', 'CIE-SHADOW-V02-013', 'CIE-SHADOW-V02-014', 'CIE-SHADOW-V02-015', 'CIE-SHADOW-V02-016', 'CIE-SHADOW-V02-017', 'CIE-SHADOW-V02-018', 'CIE-SHADOW-V02-019', 'CIE-SHADOW-V02-020']

## Top 3 measurable prompt weaknesses

1. **excessive_fixed_opening** — `{"uniqueOpeningRatio": 0.1, "topOpening": ["패스 연결 <NUM>건이 확인되었습니다. p<NUM", 19]}`
2. **generic_or_repeated_recommendation_phrase** — `{"meanQ04": 1.0, "topRecommendation": [["위험 지역 안전 옵션 리허설", 6], ["볼 순환", 3], ["받기 전 스캔", 2]]}`
3. **low_input_differentiation_high_pairwise_similarity** — `{"meanQ03": 1.0, "meanPairwiseJaccard": 0.2451}`

## Note

Do not create cip-v0.2.0 until PM authorizes evidence-based correction.
