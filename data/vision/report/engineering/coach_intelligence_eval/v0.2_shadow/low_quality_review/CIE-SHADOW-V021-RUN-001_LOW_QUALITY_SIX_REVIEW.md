# CIE Shadow V021 — Low-Quality Six Root Cause Review

**Quality Gate:** FAIL (6 > 5)  
**Bottleneck:** `F. MIXED`  

## Six-sample findings

### CIE-SHADOW-V02-003 (PLAYER)

- opening: `P1의 FII는 66점으로 P2(58점)보다 8점 차이가 있습니다....`
- opening source: **PLAYER_CONTEXT** | headline dominated: False
- scores: Q01=1 Q02=1 Q03=1 Q04=1 (total=4)
- judge: The rewrite provides a general overview of player performance and training focus but lacks specific actionable insights and detailed evidence from the FII data.
- evidence used: ['player:P1', 'player:P2', 'eventCounts.TURNOVER']
- ignored: []
- bottleneck: judge perceived generic overview despite partial evidence use

### CIE-SHADOW-V02-004 (SEQUENCE)

- opening: `섀도 세션 요약입니다....`
- opening source: **MATCH_SUMMARY_HEADLINE** | headline dominated: True
- scores: Q01=1 Q02=1 Q03=1 Q04=1 (total=4)
- judge: The rewrite provides a general overview of the session and mentions the focus for the next training, but lacks specific actionable insights and detailed evidence from the FII/coachInsights.
- evidence used: ['player:P2', 'eventCounts.PASS', 'eventCounts.RECEIVE', 'eventCounts.TURNOVER']
- ignored: ['primary SEQUENCE keyChangeToday: 패스 11건·리시브 9건·턴오버 3건의 이벤트 흐름이 기록되었습니다.']
- bottleneck: generic session-summary lead diluted evidence specificity (headline salience)

### CIE-SHADOW-V02-005 (AXIS)

- opening: `섀도 세션 요약입니다....`
- opening source: **MATCH_SUMMARY_HEADLINE** | headline dominated: True
- scores: Q01=1 Q02=1 Q03=1 Q04=1 (total=4)
- judge: The rewrite provides a general overview of the team's performance and areas for improvement but lacks specific actionable insights and detailed evidence from the FII/coachInsights.
- evidence used: ['player:P2', 'eventCounts.PASS', 'eventCounts.RECEIVE', 'eventCounts.TURNOVER']
- ignored: ['primary AXIS keyChangeToday: 압박(pressure) 축 47점이 팀 축 중 가장 낮습니다.']
- bottleneck: generic session-summary lead diluted evidence specificity (headline salience)

### CIE-SHADOW-V02-006 (NUMERIC)

- opening: `섀도 세션 요약입니다....`
- opening source: **MATCH_SUMMARY_HEADLINE** | headline dominated: True
- scores: Q01=1 Q02=1 Q03=1 Q04=1 (total=4)
- judge: The rewrite provides a general overview of the session and highlights the need for improvement in receiving compared to passing, but lacks specific actionable insights and detailed evidence from the FII/coachInsights.
- evidence used: ['player:P1', 'player:P2', 'eventCounts.PASS', 'eventCounts.RECEIVE', 'eventCounts.TURNOVER']
- ignored: ['primary NUMERIC keyChangeToday: 리시브 12건이 패스 15건 대비 낮게 관측되었습니다.']
- bottleneck: generic session-summary lead diluted evidence specificity (headline salience)

### CIE-SHADOW-V02-009 (PLAYER)

- opening: `섀도 세션 요약입니다....`
- opening source: **MATCH_SUMMARY_HEADLINE** | headline dominated: True
- scores: Q01=1 Q02=1 Q03=1 Q04=1 (total=4)
- judge: The rewrite provides a general overview of the session and highlights some strengths and improvement points, but lacks specific actionable insights and detailed evidence from the FII/coachInsights.
- evidence used: ['player:P3', 'player:P4', 'eventCounts.PASS', 'eventCounts.TURNOVER']
- ignored: []
- bottleneck: generic session-summary lead diluted evidence specificity (headline salience)

### CIE-SHADOW-V02-015 (AXIS)

- opening: `섀도 세션 요약입니다....`
- opening source: **MATCH_SUMMARY_HEADLINE** | headline dominated: True
- scores: Q01=1 Q02=1 Q03=1 Q04=1 (total=4)
- judge: The rewrite provides a general overview of the team's performance and identifies a focus area (vision) but lacks specific actionable insights and detailed evidence from the FII/coachInsights.
- evidence used: ['player:P1', 'eventCounts.PASS', 'eventCounts.RECEIVE', 'eventCounts.TURNOVER']
- ignored: ['primary AXIS keyChangeToday: 비전(vision) 축 51점이 팀 축 중 상대적으로 낮습니다.']
- bottleneck: generic session-summary lead diluted evidence specificity (headline salience)

## Headline salience (20 samples)

- headline family count: **20/20**
- openings following headline: **10/20**
- low-quality rate (headline-opening samples): **0.5**
- low-quality rate (all shared-headline inputs): **0.3**
- opening source dist: `Counter({'MATCH_SUMMARY_HEADLINE': 9, 'PLAYER_CONTEXT': 6, 'KEY_CHANGE_TODAY': 5})`
- recommendation source dist: `Counter({'OTHER': 13, 'ALLOWED_FACT_DERIVED': 7})`

## Recommended next action

PM GO for dataset architecture v0.2.2: de-homogenize or demote matchSummary.headline/summary (neutral labels, move below coachInsights, or omit from user payload); re-run ONE shadow validation only after structural fix is proven in request capture. Do NOT tune cip-v0.2.2.
