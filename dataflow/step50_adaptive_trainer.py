"""
Step 50: Adaptive Learning Orchestrator
품질 스트림 + 시뮬레이션 결과를 병합하여 모델 재학습
"""

import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, GoogleCloudOptions, StandardOptions
from google.cloud import bigquery, storage
import pandas as pd
import lightgbm as lgb
import joblib
import json
import tempfile
import os
from datetime import datetime


class LoadAndJoin(beam.DoFn):
    """BigQuery에서 실제 품질 데이터와 시뮬레이션 결과를 조인"""
    
    def process(self, element):
        client = bigquery.Client()
        
        # BigQuery 쿼리: 실제 품질 데이터와 시뮬레이션 결과 조인
        query = """
        SELECT 
            a.insert_id,
            a.team_id,
            a.report_id,
            a.overallScore AS actual,
            s.predicted_score AS predicted,
            a.coverage,
            a.gaps,
            a.overlaps,
            s.params_noise_suppression AS noise_suppression,
            s.params_vad_aggressiveness AS vad_aggressiveness,
            a.event_ts,
            ABS(a.overallScore - s.predicted_score) AS delta_error
        FROM `yago_reports.quality_stream` a
        JOIN `yago_reports.simulations` s
        ON a.report_id = s.report_id
        WHERE a.event_ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        AND s.predicted_score IS NOT NULL
        ORDER BY a.event_ts DESC
        """
        
        try:
            query_job = client.query(query)
            rows = query_job.result()
            
            for row in rows:
                yield {
                    'insert_id': row.insert_id,
                    'team_id': row.team_id,
                    'report_id': row.report_id,
                    'actual': float(row.actual) if row.actual else 0.0,
                    'predicted': float(row.predicted) if row.predicted else 0.0,
                    'coverage': float(row.coverage) if row.coverage else 0.0,
                    'gaps': int(row.gaps) if row.gaps else 0,
                    'overlaps': int(row.overlaps) if row.overlaps else 0,
                    'noise_suppression': row.noise_suppression or 'normal',
                    'vad_aggressiveness': row.vad_aggressiveness or 'medium',
                    'event_ts': row.event_ts.isoformat() if row.event_ts else None,
                    'delta_error': float(row.delta_error) if row.delta_error else 0.0,
                }
        except Exception as e:
            print(f"❌ BigQuery 쿼리 오류: {e}")
            return []


class TrainModel(beam.DoFn):
    """LightGBM 모델 재학습"""
    
    def process(self, rows):
        import numpy as np
        
        rows_list = list(rows)
        if len(rows_list) < 10:
            print(f"⚠️ 데이터가 부족합니다 (최소 10개 필요): {len(rows_list)}개")
            return []
        
        try:
            df = pd.DataFrame(rows_list)
            
            # 데이터 정제
            df = df.fillna(0)
            df['delta'] = df['actual'] - df['predicted']
            
            # 특징 벡터 구성
            X = df[['coverage', 'gaps', 'overlaps']].copy()
            X['vad'] = df['vad_aggressiveness'].map({'low': 0, 'medium': 1, 'high': 2}).fillna(1)
            X['ns'] = df['noise_suppression'].map({'weak': 0, 'normal': 1, 'strong': 2}).fillna(1)
            
            # 타겟 변수
            y = df['actual']
            
            # LightGBM 모델 학습
            model = lgb.LGBMRegressor(
                num_leaves=16,
                learning_rate=0.1,
                n_estimators=100,
                objective='regression',
                metric='rmse',
                verbose=-1
            )
            
            model.fit(X, y)
            
            # 모델 평가 (간단한 RMSE 계산)
            y_pred = model.predict(X)
            rmse = np.sqrt(np.mean((y - y_pred) ** 2))
            mae = np.mean(np.abs(y - y_pred))
            
            print(f"✅ 모델 학습 완료: RMSE={rmse:.4f}, MAE={mae:.4f}, 데이터 수={len(df)}")
            
            # 임시 파일에 모델 저장
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pkl') as f:
                joblib.dump(model, f.name)
                model_path = f.name
            
            yield {
                'model_path': model_path,
                'rmse': float(rmse),
                'mae': float(mae),
                'data_count': len(df),
                'timestamp': datetime.now().isoformat(),
            }
            
        except Exception as e:
            print(f"❌ 모델 학습 오류: {e}")
            return []


class UploadToGCS(beam.DoFn):
    """GCS 버킷에 모델 업로드"""
    
    def __init__(self, bucket_name):
        self.bucket_name = bucket_name
    
    def process(self, model_info):
        try:
            client = storage.Client()
            bucket = client.bucket(self.bucket_name)
            
            # 모델 파일명 생성 (타임스탬프 포함)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            model_name = f"quality-predictor/model_{timestamp}.pkl"
            
            # GCS에 업로드
            blob = bucket.blob(model_name)
            blob.upload_from_filename(model_info['model_path'])
            
            # 메타데이터 저장
            metadata = {
                'rmse': model_info.get('rmse', 0),
                'mae': model_info.get('mae', 0),
                'data_count': model_info.get('data_count', 0),
                'timestamp': model_info.get('timestamp', ''),
            }
            blob.metadata = metadata
            blob.patch()
            
            print(f"✅ 모델 업로드 완료: gs://{self.bucket_name}/{model_name}")
            
            # 임시 파일 삭제
            try:
                os.unlink(model_info['model_path'])
            except:
                pass
            
            yield {
                'gcs_uri': f"gs://{self.bucket_name}/{model_name}",
                'public_url': blob.public_url if blob.public_url else '',
                'rmse': metadata['rmse'],
                'mae': metadata['mae'],
                'data_count': metadata['data_count'],
            }
            
        except Exception as e:
            print(f"❌ GCS 업로드 오류: {e}")
            return []


def run(argv=None):
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True, help='GCP 프로젝트 ID')
    parser.add_argument('--region', default='asia-northeast3', help='GCP 리전')
    parser.add_argument('--runner', default='DataflowRunner', help='Beam Runner')
    parser.add_argument('--temp_location', required=True, help='GCS 임시 파일 위치')
    parser.add_argument('--staging_location', required=True, help='GCS 스테이징 위치')
    parser.add_argument('--model_bucket', default='yago-models', help='모델 저장 버킷')
    
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
    
    # 파이프라인 실행
    with beam.Pipeline(options=options) as p:
        (
            p
            | 'Load' >> beam.Create([None])
            | 'JoinData' >> beam.ParDo(LoadAndJoin())
            | 'WindowAll' >> beam.combiners.ToList()
            | 'Train' >> beam.ParDo(TrainModel())
            | 'Upload' >> beam.ParDo(UploadToGCS(args.model_bucket))
        )


if __name__ == '__main__':
    run()

