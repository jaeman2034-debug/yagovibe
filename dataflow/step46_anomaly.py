"""
Step 46: 실시간 이상 탐지 파이프라인 (Apache Beam)
Sliding Window + Z-Score/MAD 기반 이상 탐지
"""

import json
import argparse
import statistics
from datetime import datetime

import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, GoogleCloudOptions, StandardOptions
from apache_beam.io.gcp.pubsub import ReadFromPubSub, WriteToPubSub


class ParseJson(beam.DoFn):
    """Pub/Sub 메시지 JSON 파싱"""
    
    def process(self, element):
        try:
            # Pub/Sub 메시지 파싱
            if isinstance(element, tuple):
                data_bytes, attributes = element
                data_str = data_bytes.decode('utf-8')
            else:
                data_str = element.decode('utf-8')
            
            payload = json.loads(data_str)
            yield payload
        except Exception as e:
            print(f"❌ JSON 파싱 오류: {e}")
            return []


class KeyByTeam(beam.DoFn):
    """팀 ID로 키 생성"""
    
    def process(self, element):
        team_id = element.get('team_id', 'unknown')
        yield (team_id, element)


class ComputeAnomaly(beam.DoFn):
    """Sliding Window 기반 이상 탐지"""
    
    def __init__(self, z_threshold=2.5, cov_min=0.9, gaps_max=10, overlaps_max=8):
        self.z_threshold = z_threshold
        self.cov_min = cov_min
        self.gaps_max = gaps_max
        self.overlaps_max = overlaps_max
    
    def process(self, element, window=beam.DoFn.WindowParam):
        team_id, rows = element
        rows_list = list(rows)
        
        if len(rows_list) < 3:  # 최소 3개 데이터 필요
            return []
        
        # 최신 데이터
        latest = rows_list[-1]
        
        # 윈도우 시간 정보 추출
        try:
            window_start = window.start.to_utc_datetime().isoformat() + 'Z'
            window_end = window.end.to_utc_datetime().isoformat() + 'Z'
        except:
            # 윈도우 정보가 없으면 현재 시간 사용
            window_start = datetime.utcnow().isoformat() + 'Z'
            window_end = datetime.utcnow().isoformat() + 'Z'
        
        # 값 추출
        scores = [float(r.get('overallScore', 0)) for r in rows_list]
        coverages = [float(r.get('coverage', 0)) for r in rows_list]
        gaps = [int(r.get('gaps', 0)) for r in rows_list]
        overlaps = [int(r.get('overlaps', 0)) for r in rows_list]
        
        alerts = []
        
        # Z-Score 기반 이상 탐지 (Score)
        if len(scores) >= 3:
            mean = statistics.mean(scores)
            stdev = statistics.stdev(scores) if len(scores) > 1 else 0
            
            if stdev > 0:
                latest_score = scores[-1]
                z_score = abs((latest_score - mean) / stdev)
                
                if z_score > self.z_threshold:
                    alerts.append({
                        'type': 'score_anomaly',
                        'message': f"Score Z-score {z_score:.2f} > {self.z_threshold} (mean={mean:.2f}, latest={latest_score:.2f})"
                    })
        
        # MAD (Median Absolute Deviation) 기반 이상 탐지 (대안)
        if len(scores) >= 5:
            median = statistics.median(scores)
            mad = statistics.median([abs(s - median) for s in scores])
            
            if mad > 0:
                latest_score = scores[-1]
                mad_score = abs((latest_score - median) / mad)
                
                if mad_score > self.z_threshold:
                    alerts.append({
                        'type': 'score_mad_anomaly',
                        'message': f"Score MAD-score {mad_score:.2f} > {self.z_threshold} (median={median:.2f}, latest={latest_score:.2f})"
                    })
        
        # 규칙 기반 보조 조건
        if coverages and coverages[-1] < self.cov_min:
            alerts.append({
                'type': 'coverage_low',
                'message': f"coverage {coverages[-1]*100:.1f}% < {self.cov_min*100:.0f}%"
            })
        
        if gaps and gaps[-1] > self.gaps_max:
            alerts.append({
                'type': 'gaps_high',
                'message': f"gaps {gaps[-1]} > {self.gaps_max}"
            })
        
        if overlaps and overlaps[-1] > self.overlaps_max:
            alerts.append({
                'type': 'overlaps_high',
                'message': f"overlaps {overlaps[-1]} > {self.overlaps_max}"
            })
        
        # 이상이 감지된 경우에만 출력
        if alerts:
            yield {
                'team_id': team_id,
                'report_id': latest.get('report_id', ''),
                'event_ts': latest.get('event_ts', ''),
                'overallScore': float(latest.get('overallScore', 0)),
                'coverage': float(latest.get('coverage', 0)),
                'gaps': int(latest.get('gaps', 0)),
                'overlaps': int(latest.get('overlaps', 0)),
                'window': {
                    'start': window_start,
                    'end': window_end,
                    'count': len(rows_list),
                    'mean': statistics.mean(scores) if scores else 0,
                    'stdev': statistics.stdev(scores) if len(scores) > 1 else 0,
                },
                'alerts': alerts
            }


class ToJson(beam.DoFn):
    """객체를 JSON 문자열로 변환"""
    
    def process(self, obj):
        yield json.dumps(obj).encode('utf-8')


def run(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True, help='GCP 프로젝트 ID')
    parser.add_argument('--region', default='asia-northeast3', help='GCP 리전')
    parser.add_argument('--runner', default='DataflowRunner', help='Beam Runner')
    parser.add_argument('--temp_location', required=True, help='GCS 임시 파일 위치')
    parser.add_argument('--staging_location', required=True, help='GCS 스테이징 위치')
    parser.add_argument('--input_subscription', required=True, help='Pub/Sub 구독 경로')
    parser.add_argument('--output_topic', required=True, help='Pub/Sub 출력 토픽 경로')
    parser.add_argument('--z_threshold', type=float, default=2.5, help='Z-Score 임계치')
    parser.add_argument('--cov_min', type=float, default=0.9, help='커버리지 최소값')
    parser.add_argument('--gaps_max', type=int, default=10, help='Gaps 최대값')
    parser.add_argument('--overlaps_max', type=int, default=8, help='Overlaps 최대값')
    parser.add_argument('--window_size', type=int, default=900, help='윈도우 크기 (초, 기본 15분)')
    parser.add_argument('--window_period', type=int, default=300, help='윈도우 주기 (초, 기본 5분)')
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
            | 'Read' >> ReadFromPubSub(
                subscription=args.input_subscription,
                with_attributes=True
            )
            | 'Parse' >> beam.ParDo(ParseJson())
            | 'KeyByTeam' >> beam.ParDo(KeyByTeam())
            | 'Window' >> beam.WindowInto(
                beam.window.SlidingWindows(
                    size=args.window_size,
                    period=args.window_period
                )
            )
            | 'Group' >> beam.GroupByKey()
            | 'Detect' >> beam.ParDo(ComputeAnomaly(
                z_threshold=args.z_threshold,
                cov_min=args.cov_min,
                gaps_max=args.gaps_max,
                overlaps_max=args.overlaps_max
            ))
            | 'ToJson' >> beam.ParDo(ToJson())
            | 'Publish' >> WriteToPubSub(topic=args.output_topic)
        )


if __name__ == '__main__':
    run()

