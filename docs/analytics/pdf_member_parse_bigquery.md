# PDF 멤버 파싱 — BigQuery 분석 쿼리 템플릿

## 데이터 소스

- 앱: `src/lib/eventLog.ts` → Firestore `eventLogs`에 `event` 및 필드 전개 저장
- PDF 관련 이벤트:
  - `pdf_parse_success` — `teamId`, `totalRows`, `validRows`, `invalidRows`, `accuracy`, `guessedRoleCount`, `unknownRows`, `unknownFormatRate`, **`unknownReasonTails`** (미인식 **행별** 꼬리 문자열, 최대 50개; 예: `붙어쓰기`, `기타`), `unknownSamples` (정성, 최대 20, 마스킹)
  - `pdf_members_confirm` — `teamId`, `totalRows`, `validRows`, `successCount`, `failCount`, `guessedRoleCount`, `editedRows`, `editRate`
  - (참고) `pdf_upload_start`, `pdf_parse_fail` 등

**BigQuery에 넣는 방법 예시**

- Firestore → BigQuery 익스텐션, Cloud Functions ELT, 혹은 GA4가 아닌 **커스텀 내보내기**
- 아래 SQL은 **행 단위로 위 필드가 그대로 컬럼**이 있다고 가정합니다.  
  JSON 한 컬럼만 있다면 `JSON_EXTRACT` / `JSON_VALUE`로 감싸서 바꾸면 됩니다.
- `unknownReasonTails`·`unknownSamples`는 `ARRAY<STRING>` 또는 `STRING`(JSON)일 수 있음.

**플레이스홀더 (모두 본인 환경에 맞게 교체)**

- `` `my-project.data_warehouse.event_logs` ``

---

## 0a) 실전 최소 — 테이블 + 타임스탬프 컬럼만 맞추고 100건

**주의:** `pdf_parse_success`와 `pdf_members_confirm`는 **필드가 다릅니다.**  
한 SELECT에서 `SAFE_DIVIDE(editedRows, totalRows)`를 두 이벤트에 같이 쓰면, parse 행은 `editedRows`가 없어 **NULL·왜곡**이 납니다. 아래는 **이벤트별로 의미 있는 컬럼만** 채웁니다.

```sql
-- ① `my-project.dataset.event_logs` → 본인 테이블
-- ② createdAt → timestamp / event_timestamp 등 실제 컬럼명
SELECT
  DATE(createdAt) AS date,
  teamId,
  event,
  totalRows,
  validRows,
  CASE WHEN event = 'pdf_parse_success' THEN SAFE_DIVIDE(validRows, totalRows) END AS accuracy,
  CASE WHEN event = 'pdf_parse_success' THEN SAFE_DIVIDE(unknownRows, totalRows) END AS unknown_format_rate,
  CASE WHEN event = 'pdf_parse_success' THEN SAFE_DIVIDE(guessedRoleCount, NULLIF(totalRows, 0)) END AS guessed_role_rate,
  CASE WHEN event = 'pdf_members_confirm' THEN editedRows END AS edited_rows,
  CASE WHEN event = 'pdf_members_confirm' THEN editRate END AS edit_rate,
  CASE WHEN event = 'pdf_members_confirm' THEN SAFE_DIVIDE(guessedRoleCount, NULLIF(validRows, 0)) END AS guessed_role_rate_on_valid
FROM `my-project.data_warehouse.event_logs`
WHERE event IN ('pdf_parse_success', 'pdf_members_confirm')
ORDER BY createdAt DESC
LIMIT 100;
```

`unknownReasonTails` TOP은 §3. 배열이 JSON 문자열이면 `JSON_QUERY_ARRAY` 후 `UNNEST`로 바꿉니다.

---

## 0) 날짜·팀 단위 (기본 절)

```sql
-- 파라미터: 분석 기간, 특정 팀(옵션)
DECLARE start_date DATE DEFAULT DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY);
DECLARE end_date DATE DEFAULT CURRENT_DATE();
DECLARE target_team_id STRING DEFAULT NULL; -- NULL 이면 전체 팀
```

필터 예:

```sql
WHERE
  DATE(createdAt) BETWEEN start_date AND end_date
  AND (target_team_id IS NULL OR teamId = target_team_id)
```

(타임스탬프 컬럼명이 `created_at`이면 맞게 수정.)

---

## 1) 일별 + 팀 — 핵심 4지표 (parse + confirm)

`guessedRoleRate` 정의(권장):

- parse 행: `guessedRoleCount / NULLIF(totalRows, 0)`
- confirm 행: `guessedRoleCount / NULLIF(validRows, 0)`

```sql
WITH
parse_day AS (
  SELECT
    DATE(createdAt) AS d,
    teamId,
    COUNT(*) AS parse_events,
    AVG(accuracy) AS avg_accuracy,
    AVG(unknownFormatRate) AS avg_unknownFormatRate,
    AVG(SAFE_DIVIDE(guessedRoleCount, NULLIF(totalRows, 0))) AS avg_guessedRoleRate_parse
  FROM `my-project.data_warehouse.event_logs`
  WHERE event = 'pdf_parse_success'
  GROUP BY 1, 2
),
confirm_day AS (
  SELECT
    DATE(createdAt) AS d,
    teamId,
    COUNT(*) AS confirm_events,
    AVG(editRate) AS avg_editRate,
    AVG(SAFE_DIVIDE(guessedRoleCount, NULLIF(validRows, 0))) AS avg_guessedRoleRate_confirm
  FROM `my-project.data_warehouse.event_logs`
  WHERE event = 'pdf_members_confirm'
  GROUP BY 1, 2
)
SELECT
  COALESCE(p.d, c.d) AS day,
  COALESCE(p.teamId, c.teamId) AS teamId,
  p.parse_events,
  p.avg_accuracy,
  p.avg_unknownFormatRate,
  p.avg_guessedRoleRate_parse,
  c.confirm_events,
  c.avg_editRate,
  c.avg_guessedRoleRate_confirm
FROM parse_day p
FULL OUTER JOIN confirm_day c
  ON p.d = c.d AND p.teamId = c.teamId
ORDER BY day DESC, teamId
LIMIT 500;
```

### 1a) 대시보드 첫 화면용 — 4지표만 (일·팀)

아래 네 컬럼이 질문하신 KPI에 대응합니다.

| 컬럼 | 의미 |
|------|------|
| `accuracy` | `pdf_parse_success` 이벤트당 `accuracy`의 **일·팀 평균** |
| `unknown_format_rate` | 같은 단위에서 `unknownFormatRate` 평균 |
| `guessed_role_rate` | `guessedRoleCount / totalRows`를 이벤트마다 계산한 뒤 **일·팀 평균** |
| `edit_rate` | `pdf_members_confirm`의 `editRate` **일·팀 평균** (해당 일·팀에 confirm이 없으면 NULL) |

```sql
DECLARE start_date DATE DEFAULT DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY);
DECLARE end_date DATE DEFAULT CURRENT_DATE();

WITH parse_day AS (
  SELECT
    DATE(createdAt) AS day,
    teamId,
    AVG(accuracy) AS accuracy,
    AVG(unknownFormatRate) AS unknown_format_rate,
    AVG(SAFE_DIVIDE(guessedRoleCount, NULLIF(totalRows, 0))) AS guessed_role_rate,
    COUNT(*) AS parse_event_count
  FROM `my-project.data_warehouse.event_logs`
  WHERE event = 'pdf_parse_success'
    AND DATE(createdAt) BETWEEN start_date AND end_date
  GROUP BY 1, 2
),
confirm_day AS (
  SELECT
    DATE(createdAt) AS day,
    teamId,
    AVG(editRate) AS edit_rate,
    COUNT(*) AS confirm_event_count
  FROM `my-project.data_warehouse.event_logs`
  WHERE event = 'pdf_members_confirm'
    AND DATE(createdAt) BETWEEN start_date AND end_date
  GROUP BY 1, 2
)
SELECT
  COALESCE(p.day, c.day) AS day,
  COALESCE(p.teamId, c.teamId) AS team_id,
  p.accuracy,
  p.unknown_format_rate,
  p.guessed_role_rate,
  c.edit_rate,
  p.parse_event_count,
  c.confirm_event_count
FROM parse_day p
FULL OUTER JOIN confirm_day c
  ON p.day = c.day AND p.teamId = c.teamId
ORDER BY day DESC, team_id
LIMIT 500;
```

**주의:** 같은 날 같은 팀에서 PDF를 여러 번 열면, 위 값은 **여러 세션의 평균**입니다. 세션 단위 1:1은 §4 또는 `parseSessionId` 도입을 권장합니다.

---

## 2) 조합 시그널 (팀+일, 가공 컬럼)

스프레드시트에서 쓰기 좋게 한 행에 `unknown` + `edit` 둘 다 (FULL JOIN이 없으면 LEFT로).

```sql
SELECT
  COALESCE(p.d, c.d) AS day,
  COALESCE(p.teamId, c.teamId) AS teamId,
  p.avg_unknownFormatRate AS unknown_fmt_rate,
  c.avg_editRate AS edit_rate
FROM
  (
    SELECT DATE(createdAt) AS d, teamId, AVG(unknownFormatRate) AS avg_unknownFormatRate
    FROM `my-project.data_warehouse.event_logs`
    WHERE event = 'pdf_parse_success'
    GROUP BY 1, 2
  ) p
FULL OUTER JOIN
  (
    SELECT DATE(createdAt) AS d, teamId, AVG(editRate) AS avg_editRate
    FROM `my-project.data_warehouse.event_logs`
    WHERE event = 'pdf_members_confirm'
    GROUP BY 1, 2
  ) c
  ON p.d = c.d AND p.teamId = c.teamId;
```

**해석 (이벤트당 평균 기준, 대략적):**

- `unknown_fmt_rate` 낮고 `edit_rate` 높음 → **파싱은 됐는데 값(직위/이름 등) 수정 많음**
- `unknown_fmt_rate` 높고 `edit_rate` 낮음 → **미인식 다수, 수동으로 채운 비중은 상대적으로 적을 수 있음** (팀/표본에 따라 이탈·포기도 있음)
- 둘 다 높음 → **구조/품질 이슈 가능**
- 둘 다 낮음 → **안정**에 가까움

---

## 3) `unknownReasonTails` — TOP 꼬리(정량) 집계

**역할:** `unknownSamples`는 정성, `unknownReasonTails`는 **행마다 1꼬리씩** 쌓아 BQ에서 `UNNEST`·`COUNT`에 사용.

(한 이벤트당 최대 50개; `unknownRows`는 전체 미인식 행 수 — 꼬리 50초과분은 별도 비율만으로 보정하거나 세션 id 도입 권장.)

```sql
-- 전 기간, 꼬리별 건수(미인식 행 단위; 동일 PDF에서 여러 행이면 같은 꼬리가 여러 번 카운트)
SELECT
  reason_tail,
  COUNT(*) AS tail_mentions
FROM `my-project.data_warehouse.event_logs` AS e
CROSS JOIN UNNEST(COALESCE(e.unknownReasonTails, [])) AS reason_tail
WHERE e.event = 'pdf_parse_success'
GROUP BY reason_tail
ORDER BY tail_mentions DESC;
```

비율(꼬리 / 전체 unknown reason 행)은 앱·배치에서 `SUM(unknownRows)`로 분모 잡거나, `row_count` 합으로 나눔.

**샘플 열람 (정성):**

```sql
SELECT
  DATE(createdAt) AS day,
  teamId,
  unknownRows,
  unknownFormatRate,
  unknownReasonTails,
  unknownSamples
FROM `my-project.data_warehouse.event_logs`
WHERE event = 'pdf_parse_success'
  AND COALESCE(unknownRows, 0) > 0
ORDER BY day DESC, unknownFormatRate DESC
LIMIT 200;
```

`unknown_format:기타` 꼬리는 **새 패턴 후보** — 대시보드에서 제거하지 말고 추이만 본다.

---

## 4) parse → confirm (세션 ID 없을 때) 근사 조인

동일 `uid` + `teamId`에서, **confirm이 parse 뒤 짧은 시간(예: 2시간)** 내 발생한 쌍을 붙이는 **근사** (완벽하진 않음).  
`event_logs`에 `uid`가 있다는 전제(현재 `eventLog`가 `uid` 저장).

```sql
-- 예: 2시간 이내 가장 가까운 parse 1건과 join (BigQuery: 윈도우/ASOF 패턴)
WITH
parsed AS (
  SELECT event AS ev, uid, teamId, createdAt, accuracy, unknownFormatRate, totalRows, validRows
  FROM `my-project.data_warehouse.event_logs`
  WHERE event = 'pdf_parse_success'
),
confirmed AS (
  SELECT event AS ev, uid, teamId, createdAt, editRate, guessedRoleCount, validRows
  FROM `my-project.data_warehouse.event_logs`
  WHERE event = 'pdf_members_confirm'
)
SELECT
  c.uid,
  c.teamId,
  p.createdAt AS parsed_at,
  c.createdAt AS confirmed_at,
  p.accuracy,
  p.unknownFormatRate,
  c.editRate,
  c.guessedRoleCount
FROM confirmed c
JOIN parsed p
  ON c.uid = p.uid
  AND c.teamId = p.teamId
  AND c.createdAt > p.createdAt
  AND TIMESTAMP_DIFF(c.createdAt, p.createdAt, MINUTE) <= 120
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY c.uid, c.teamId, c.createdAt
  ORDER BY p.createdAt DESC
) = 1;
```

정확한 1:1이 필요하면 앱에 **`parseSessionId`**(UUID)를 `pdf_parse_success` / `pdf_members_confirm` 둘 다에 넣는 것을 권장합니다.

---

## 5) 가져오는 이벤트(참고)

`MembersTab` 기준:

| 이벤트 | 용도 |
|--------|------|
| `pdf_parse_success` | `accuracy`, `unknownFormatRate`, `guessedRole` 비율(파생) |
| `pdf_members_confirm` | `editRate`, 등록 `guessedRole` 비율(파생) |

`guessedRoleCount` + `validRows`/`totalRows`를 **같이** 보는 것이 `editRate`만 보는 것보다 안전합니다(직위 추정·수정 여부).

---

## 6) 부록) Firebase Analytics( GA4 ) → `events_*` 를 쓰는 경우

이벤트·파라미터가 `event_params` 배열에 있으면 `UNNEST`로 꺼냅니다. (이벤트명·키 스펠링은 GA 콘솔과 맞출 것.)

```sql
SELECT
  event_date,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'teamId') AS teamId,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'totalRows') AS totalRows
-- ...
FROM `my-project.analytics_XXXXX.events_*`
WHERE event_name = 'pdf_parse_success'
  AND _TABLE_SUFFIX BETWEEN '20260101' AND '20260131'
LIMIT 100;
```

(현재 `MembersTab`는 `@/lib/eventLog` = **Firestore** 경로이므로, GA에 동일 이벤트를 복제하지 않았다면 이 테이블엔 없을 수 있습니다.)
