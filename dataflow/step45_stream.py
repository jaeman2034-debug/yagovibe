"""
Step 45: Dataflow 파이프라인 (Apache Beam)
Pub/Sub → 변환/검증/중복제거 → BigQuery 스트리밍
"""

import json
import argparse
import hashlib
import time
from datetime import datetime

import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, GoogleCloudOptions, StandardOptions
from apache_beam.io.gcp.bigquery import WriteToBigQuery, BigQueryDisposition
from apache_beam.io.gcp.pubsub import ReadFromPubSub


class ParseAndValidate(beam.DoFn):
    """Pub/Sub 메시지 파싱 및 검증"""
    
    def process(self, element):
        try:
            # Pub/Sub 메시지 파싱
            if isinstance(element, tuple):
                # (data, attributes) 형식
                data_bytes, attributes = element
                data_str = data_bytes.decode('utf-8')
            else:
                data_str = element.decode('utf-8')
                attributes = {}
            
            # JSON 파싱
            payload = json.loads(data_str)
            
            # 필수 필드 검증
            required_fields = ['insert_id', 'team_id', 'report_id', 'event_ts']
            for field in required_fields:
                if field not in payload:
                    raise ValueError(f"필수 필드 누락: {field}")
            
            # 타입 검증 및 변환
            validated = {
                'insert_id': str(payload['insert_id']),
                'team_id': str(payload['team_id']),
                'report_id': str(payload['report_id']),
                'event_ts': payload['event_ts'],  # ISO 형식 문자열
                'overallScore': float(payload.get('overallScore', 0)),
                'coverage': float(payload.get('coverage', 0)),
                'gaps': int(payload.get('gaps', 0)),
                'overlaps': int(payload.get('overlaps', 0)),
                'avgDur': float(payload.get('avgDur', 0)),
                'source': str(payload.get('source', 'stream')),
                'load_ts': datetime.utcnow().isoformat() + 'Z',  # 현재 시간
            }
            
            # 값 범위 검증
            if not (0 <= validated['overallScore'] <= 1):
                raise ValueError(f"overallScore 범위 오류: {validated['overallScore']}")
            if not (0 <= validated['coverage'] <= 1):
                raise ValueError(f"coverage 범위 오류: {validated['coverage']}")
            
            yield validated
            
        except Exception as e:
            # 오류 로깅 (실제 운영에서는 Dead Letter Queue로 전송)
            print(f"❌ 파싱/검증 오류: {e}, 데이터: {data_str if 'data_str' in locals() else element}")
            # 오류 메시지는 무시하고 계속 진행


class DeduplicateByInsertId(beam.DoFn):
    """insert_id 기반 중복 제거 (메모리 캐시)"""
    
    def __init__(self, ttl_sec=3600):
        self.ttl_sec = ttl_sec
        self.seen = None
    
    def setup(self):
        # 단순 메모리 캐시 (작은 규모)
        # 운영 환경에서는 Redis/Spanner/Bigtable 기반 Bloom/Cache로 교체 권장
        self.seen = {}
    
    def process(self, row):
        key = row['insert_id']
        now = time.time()
        
        # TTL 청소
        for k, v in list(self.seen.items()):
            if now - v > self.ttl_sec:
                del self.seen[k]
        
        # 중복 체크
        if key in self.seen:
            # 중복된 메시지, 무시
            return []
        
        # 캐시에 추가
        self.seen[key] = now
        yield row


# BigQuery 스키마 정의
SCHEMA = {
    'fields': [
        {'name': 'insert_id', 'type': 'STRING', 'mode': 'REQUIRED'},
        {'name': 'team_id', 'type': 'STRING', 'mode': 'REQUIRED'},
        {'name': 'report_id', 'type': 'STRING', 'mode': 'REQUIRED'},
        {'name': 'event_ts', 'type': 'TIMESTAMP', 'mode': 'REQUIRED'},
        {'name': 'overallScore', 'type': 'FLOAT', 'mode': 'NULLABLE'},
        {'name': 'coverage', 'type': 'FLOAT', 'mode': 'NULLABLE'},
        {'name': 'gaps', 'type': 'INTEGER', 'mode': 'NULLABLE'},
        {'name': 'overlaps', 'type': 'INTEGER', 'mode': 'NULLABLE'},
        {'name': 'avgDur', 'type': 'FLOAT', 'mode': 'NULLABLE'},
        {'name': 'source', 'type': 'STRING', 'mode': 'NULLABLE'},
        {'name': 'load_ts', 'type': 'TIMESTAMP', 'mode': 'NULLABLE'},
    ]
}


def run(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True, help='GCP 프로젝트 ID')
    parser.add_argument('--region', default='asia-northeast3', help='GCP 리전')
    parser.add_argument('--runner', default='DataflowRunner', help='Beam Runner')
    parser.add_argument('--temp_location', required=True, help='GCS 임시 파일 위치')
    parser.add_argument('--staging_location', required=True, help='GCS 스테이징 위치')
    parser.add_argument('--input_subscription', required=True, help='Pub/Sub 구독 경로')
    parser.add_argument('--bq_table', default='yago_reports.quality_stream', help='BigQuery 테이블')
    parser.add_argument('--max_num_workers', type=int, default=10, help='최대 워커 수')
    parser.add_argument('--num_workers', type=int, default=1, help='초기 워커 수')
    
    args, beam_args = parser.parse_known_args(argv)
    
    # Pipeline Options 설정
    options = PipelineOptions(beam_args, save_main_session=True, streaming=True)
    
    # GCP 옵션
    gcp = options.view_as(GoogleCloudOptions)
    gcp.project = args.project
    gcp.region = args.region
    gcp.staging_location = args.staging_location
    gcp.temp_location = args.temp_location
    
    # 표준 옵션
    std_options = options.view_as(StandardOptions)
    std_options.runner = args.runner
    std_options.streaming = True
    
    # 워커 옵션
    options.view_as(beam.options.pipeline_options.WorkerOptions).max_num_workers = args.max_num_workers
    options.view_as(beam.options.pipeline_options.WorkerOptions).num_workers = args.num_workers
    
    # 파이프라인 실행
    with beam.Pipeline(options=options) as p:
        (
            p
            | 'ReadFromPubSub' >> ReadFromPubSub(
                subscription=args.input_subscription,
                with_attributes=True
            )
            | 'ParseValidate' >> beam.ParDo(ParseAndValidate())
            | 'DedupInsertId' >> beam.ParDo(DeduplicateByInsertId(ttl_sec=3600))
            | 'WriteToBQ' >> WriteToBigQuery(
                table=args.bq_table,
                schema=SCHEMA,
                write_disposition=BigQueryDisposition.WRITE_APPEND,
                create_disposition=BigQueryDisposition.CREATE_NEVER,
                custom_gcs_temp_location=args.temp_location,
                method='STORAGE_WRITE_API',
                insert_retry_strategy='RETRY_NEVER',  # 중복 제거는 insert_id로 처리
            )
        )


if __name__ == '__main__':
    run()

