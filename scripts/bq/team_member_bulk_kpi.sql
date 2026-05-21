-- =============================================================================
-- 팀 멤버 일괄·PDF KPI — `eventLogs` → BigQuery
-- =============================================================================
-- `YOUR_PROJECT.YOUR_DATASET.event_logs` 를 실제 테이블로 바꾸세요.
-- `createdAt` 컬럼 타입이 다르면 DATE(...) 부분만 조정하세요.
-- =============================================================================

DECLARE window_start DATE DEFAULT DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY);
DECLARE window_end DATE DEFAULT CURRENT_DATE();

WITH daily AS (
  SELECT
    DATE(createdAt) AS d,
    event,
    reason,
    SAFE_CAST(validRows AS INT64) AS valid_rows,
    SAFE_CAST(successCount AS INT64) AS success_count,
    SAFE_CAST(skippedDbDuplicateCount AS INT64) AS skipped_db_dup,
    SAFE_CAST(editRate AS FLOAT64) AS edit_rate,
    action,
    dbDuplicateResolved
  FROM `YOUR_PROJECT.YOUR_DATASET.event_logs`
  WHERE DATE(createdAt) BETWEEN window_start AND window_end
    AND event IN (
      'pdf_parse_success',
      'pdf_parse_fail',
      'pdf_members_confirm',
      'team_bulk_member_db_duplicate_prompt',
      'team_bulk_member_db_duplicate_resolve'
    )
)
SELECT
  d,
  COUNTIF(event = 'pdf_parse_success') AS pdf_parse_ok,
  COUNTIF(event = 'pdf_parse_fail') AS pdf_parse_fail,
  COUNTIF(event = 'pdf_members_confirm') AS pdf_confirm,
  COUNTIF(event = 'team_bulk_member_db_duplicate_prompt') AS db_dup_prompt,
  COUNTIF(event = 'team_bulk_member_db_duplicate_resolve' AND action = 'skip') AS db_dup_resolve_skip,
  COUNTIF(event = 'team_bulk_member_db_duplicate_resolve' AND action = 'override') AS db_dup_resolve_override,
  SAFE_DIVIDE(
    COUNTIF(event = 'pdf_parse_fail'),
    NULLIF(COUNTIF(event IN ('pdf_parse_success', 'pdf_parse_fail')), 0)
  ) AS pdf_parse_fail_rate
FROM daily
GROUP BY d
ORDER BY d;

-- ---- 아래는 BigQuery 콘솔에서 위와 분리해 각각 실행 ----
--
-- PDF 확정(edit·중복 분기)
-- SELECT
--   COUNT(*) AS pdf_confirm_events,
--   AVG(SAFE_CAST(editRate AS FLOAT64)) AS avg_edit_rate,
--   AVG(SAFE_DIVIDE(SAFE_CAST(skippedDbDuplicateCount AS INT64), NULLIF(SAFE_CAST(validRows AS INT64), 0)))
--     AS avg_skipped_db_dup_over_valid,
--   COUNTIF(dbDuplicateResolved = 'skip') AS after_dup_skip,
--   COUNTIF(dbDuplicateResolved = 'override') AS after_dup_override,
--   COUNTIF(dbDuplicateResolved IS NULL) AS no_dup_branch
-- FROM `YOUR_PROJECT.YOUR_DATASET.event_logs`
-- WHERE DATE(createdAt) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND CURRENT_DATE()
--   AND event = 'pdf_members_confirm';
--
-- pdf_parse_fail 사유
-- SELECT reason, COUNT(*) AS cnt
-- FROM `YOUR_PROJECT.YOUR_DATASET.event_logs`
-- WHERE DATE(createdAt) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AND CURRENT_DATE()
--   AND event = 'pdf_parse_fail'
-- GROUP BY reason
-- ORDER BY cnt DESC;
