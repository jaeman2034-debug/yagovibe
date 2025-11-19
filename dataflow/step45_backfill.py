"""
Step 45: 백필 배치 파이프라인 (Apache Beam)
GCS Firestore Export → BigQuery 배치 적재
"""

import json
import argparse
from datetime import datetime

import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, GoogleCloudOptions, StandardOptions
from apache_beam.io.gcp.bigquery import WriteToBigQuery, BigQueryDisposition
from apache_beam.io.gcp.gcsfilesystem import GCSFileSystem

try:
    from dateutil import parser as date_parser
except ImportError:
    # dateutil이 없으면 기본 datetime 사용
    date_parser = None


class ParseFirestoreExport(beam.DoFn):
    """Firestore Export JSON 파일 파싱"""
    
    def process(self, element):
        """
        element: GCS 파일 경로 또는 파일 내용
        Firestore Export 형식: { "documents": [...] }
        """
        try:
            # GCS 파일 경로인 경우
            if isinstance(element, str) and element.startswith('gs://'):
                # 파일 시스템에서 읽기
                fs = GCSFileSystem()
                with fs.open(element, 'r') as f:
                    content = f.read()
            else:
                content = element
            
            # JSON 파싱
            data = json.loads(content)
            
            # Firestore Export 형식 처리
            if 'documents' in data:
                # Firestore Export 형식
                for doc in data['documents']:
                    yield from self._parse_document(doc)
            elif isinstance(data, list):
                # 배열 형식
                for doc in data:
                    yield from self._parse_document(doc)
            else:
                # 단일 문서
                yield from self._parse_document(data)
                
        except Exception as e:
            print(f"❌ 파싱 오류: {e}, 파일: {element}")
    
    def _parse_document(self, doc):
        """Firestore 문서를 파이프라인 형식으로 변환"""
        try:
            # 문서 경로에서 teamId, reportId, timestamp 추출
            # 예: projects/PROJECT/databases/(default)/documents/teams/TEAM_ID/reports/REPORT_ID/qualityReports/TIMESTAMP
            path = doc.get('name', '')
            
            # 경로 파싱
            parts = path.split('/')
            team_idx = -1
            report_idx = -1
            timestamp_idx = -1
            
            for i, part in enumerate(parts):
                if part == 'teams' and i + 1 < len(parts):
                    team_idx = i + 1
                elif part == 'reports' and i + 1 < len(parts):
                    report_idx = i + 1
                elif part == 'qualityReports' and i + 1 < len(parts):
                    timestamp_idx = i + 1
            
            if team_idx == -1 or report_idx == -1 or timestamp_idx == -1:
                return
            
            team_id = parts[team_idx]
            report_id = parts[report_idx]
            ts = parts[timestamp_idx]
            
            # 문서 필드 추출
            fields = doc.get('fields', {})
            
            # metrics 추출
            metrics = {}
            if 'metrics' in fields:
                metrics_field = fields['metrics']
                if 'mapValue' in metrics_field:
                    map_value = metrics_field['mapValue'].get('fields', {})
                    metrics = {
                        'overallScore': self._extract_value(map_value.get('overallScore')),
                        'coverage': self._extract_value(map_value.get('coverage')),
                        'gaps': self._extract_value(map_value.get('gaps')),
                        'overlaps': self._extract_value(map_value.get('overlaps')),
                        'avgDur': self._extract_value(map_value.get('avgDur')),
                    }
            
            # createdAt 추출
            createdAt = None
            if 'createdAt' in fields:
                createdAt = self._extract_timestamp(fields['createdAt'])
            elif 'updateTime' in doc:
                # updateTime을 createdAt으로 사용
                createdAt = self._parse_timestamp(doc['updateTime'])
            
            if not createdAt:
                createdAt = datetime.utcnow().isoformat() + 'Z'
            
            # insert_id 생성
            insert_id = f"{team_id}-{report_id}-{ts}"
            
            # 출력 형식
            output = {
                'insert_id': insert_id,
                'team_id': team_id,
                'report_id': report_id,
                'event_ts': createdAt,
                'overallScore': float(metrics.get('overallScore', 0)),
                'coverage': float(metrics.get('coverage', 0)),
                'gaps': int(metrics.get('gaps', 0)),
                'overlaps': int(metrics.get('overlaps', 0)),
                'avgDur': float(metrics.get('avgDur', 0)),
                'source': 'backfill',
                'load_ts': datetime.utcnow().isoformat() + 'Z',
            }
            
            yield output
            
        except Exception as e:
            print(f"❌ 문서 파싱 오류: {e}, 문서: {doc.get('name', 'unknown')}")
    
    def _extract_value(self, field):
        """Firestore 필드 값 추출"""
        if not field:
            return None
        
        # 다양한 타입 지원
        if 'integerValue' in field:
            return int(field['integerValue'])
        elif 'doubleValue' in field:
            return float(field['doubleValue'])
        elif 'stringValue' in field:
            return field['stringValue']
        elif 'booleanValue' in field:
            return bool(field['booleanValue'])
        elif 'timestampValue' in field:
            return self._parse_timestamp(field['timestampValue'])
        else:
            return None
    
    def _extract_timestamp(self, field):
        """Firestore Timestamp 필드 추출"""
        if not field:
            return None
        
        if 'timestampValue' in field:
            return self._parse_timestamp(field['timestampValue'])
        elif 'stringValue' in field:
            # ISO 형식 문자열
            return field['stringValue']
        else:
            return None
    
    def _parse_timestamp(self, timestamp_str):
        """Firestore Timestamp 문자열을 ISO 형식으로 변환"""
        try:
            # Firestore 형식: "2024-01-01T00:00:00.000000Z"
            if 'T' in timestamp_str:
                # 이미 ISO 형식
                return timestamp_str
            else:
                # 파싱 후 ISO 형식으로 변환
                if date_parser:
                    dt = date_parser.parse(timestamp_str)
                    return dt.isoformat() + 'Z'
                else:
                    # dateutil이 없으면 기본 파싱 시도
                    return timestamp_str
        except:
            return datetime.utcnow().isoformat() + 'Z'


class DeduplicateByInsertId(beam.DoFn):
    """insert_id 기반 중복 제거 (배치용)"""
    
    def __init__(self):
        self.seen = set()
    
    def setup(self):
        self.seen = set()
    
    def process(self, row):
        key = row['insert_id']
        
        if key in self.seen:
            # 중복된 메시지, 무시
            return []
        
        self.seen.add(key)
        yield row


# BigQuery 스키마 (step45_stream.py와 동일)
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
    parser.add_argument('--input_pattern', required=True, help='GCS 입력 파일 패턴 (예: gs://bucket/export/*.json)')
    parser.add_argument('--bq_table', default='yago_reports.quality_stream', help='BigQuery 테이블')
    parser.add_argument('--max_num_workers', type=int, default=10, help='최대 워커 수')
    parser.add_argument('--num_workers', type=int, default=2, help='초기 워커 수')
    
    args, beam_args = parser.parse_known_args(argv)
    
    # Pipeline Options 설정
    options = PipelineOptions(beam_args, save_main_session=True, streaming=False)
    
    # GCP 옵션
    gcp = options.view_as(GoogleCloudOptions)
    gcp.project = args.project
    gcp.region = args.region
    gcp.staging_location = args.staging_location
    gcp.temp_location = args.temp_location
    
    # 표준 옵션
    std_options = options.view_as(StandardOptions)
    std_options.runner = args.runner
    std_options.streaming = False  # 배치 모드
    
    # 워커 옵션
    options.view_as(beam.options.pipeline_options.WorkerOptions).max_num_workers = args.max_num_workers
    options.view_as(beam.options.pipeline_options.WorkerOptions).num_workers = args.num_workers
    
    # 파이프라인 실행
    with beam.Pipeline(options=options) as p:
        (
            p
            | 'ReadFromGCS' >> beam.io.ReadFromText(
                args.input_pattern,
                coder=beam.coders.StrUtf8Coder()
            )
            | 'ParseFirestoreExport' >> beam.ParDo(ParseFirestoreExport())
            | 'DedupInsertId' >> beam.ParDo(DeduplicateByInsertId())
            | 'WriteToBQ' >> WriteToBigQuery(
                table=args.bq_table,
                schema=SCHEMA,
                write_disposition=BigQueryDisposition.WRITE_APPEND,
                create_disposition=BigQueryDisposition.CREATE_NEVER,
                custom_gcs_temp_location=args.temp_location,
                method='FILE_LOADS',  # 배치는 FILE_LOADS 사용
            )
        )


if __name__ == '__main__':
    run()

