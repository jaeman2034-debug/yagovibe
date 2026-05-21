# 📊 ERD 스키마 초안

## 핵심 테이블

### stories
```sql
CREATE TABLE stories (
  id VARCHAR(255) PRIMARY KEY,
  region VARCHAR(50) NOT NULL,
  source VARCHAR(20) NOT NULL, -- 운영, 협회, 사용자
  category VARCHAR(20) NOT NULL, -- 대회, 모집, 협회, 마켓, 구장
  title VARCHAR(40) NOT NULL,
  subtitle VARCHAR(60),
  status VARCHAR(20) NOT NULL, -- DRAFT, PUBLISHED, EXPIRED, REJECTED
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  priority INT DEFAULT 50,
  score INT DEFAULT 0,
  is_verified_author BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_region_status (region, status),
  INDEX idx_start_end (start_at, end_at)
);
```

### grounds
```sql
CREATE TABLE grounds (
  id VARCHAR(255) PRIMARY KEY,
  region VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  capacity INT,
  price_from INT NOT NULL,
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_region (region),
  INDEX idx_location (lat, lng)
);
```

### slots
```sql
CREATE TABLE slots (
  id VARCHAR(255) PRIMARY KEY,
  ground_id VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  price INT NOT NULL,
  status VARCHAR(20) NOT NULL, -- OPEN, LOCKED, BOOKED
  locked_until TIMESTAMP,
  FOREIGN KEY (ground_id) REFERENCES grounds(id),
  INDEX idx_ground_start (ground_id, start_time),
  INDEX idx_status (status)
);
```

### reservations
```sql
CREATE TABLE reservations (
  id VARCHAR(255) PRIMARY KEY,
  slot_id VARCHAR(255) NOT NULL,
  ground_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(20) NOT NULL, -- READY, PAID, CANCELLED, EXPIRED
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (slot_id) REFERENCES slots(id),
  FOREIGN KEY (ground_id) REFERENCES grounds(id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);
```

### payments
```sql
CREATE TABLE payments (
  id VARCHAR(255) PRIMARY KEY,
  reservation_id VARCHAR(255) NOT NULL,
  amount INT NOT NULL,
  pg VARCHAR(20) NOT NULL, -- tosspay, kcp, iamport
  status VARCHAR(20) NOT NULL, -- REQUEST, APPROVED, FAILED, CANCELLED
  pg_transaction_id VARCHAR(255),
  approved_at TIMESTAMP,
  failed_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  INDEX idx_reservation (reservation_id),
  INDEX idx_status (status)
);
```

### teams
```sql
CREATE TABLE teams (
  id VARCHAR(255) PRIMARY KEY,
  region VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL, -- beginner, normal, pro
  description TEXT,
  logo_url TEXT,
  home_ground_id VARCHAR(255),
  recruit_status VARCHAR(20) NOT NULL, -- OPEN, CLOSE, FULL
  total_matches INT DEFAULT 0,
  wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  losses INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_region (region),
  INDEX idx_recruit (recruit_status)
);
```

### team_members
```sql
CREATE TABLE team_members (
  id VARCHAR(255) PRIMARY KEY,
  team_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- owner, manager, member
  status VARCHAR(20) NOT NULL, -- active, inactive, pending
  joined_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  UNIQUE KEY unique_team_user (team_id, user_id),
  INDEX idx_user (user_id)
);
```

### leagues
```sql
CREATE TABLE leagues (
  id VARCHAR(255) PRIMARY KEY,
  region VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  season VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL, -- tournament, league, friendly
  status VARCHAR(20) NOT NULL, -- READY, RUNNING, ENDED
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  organizer_id VARCHAR(255),
  association_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_region_status (region, status)
);
```

### matches
```sql
CREATE TABLE matches (
  id VARCHAR(255) PRIMARY KEY,
  league_id VARCHAR(255) NOT NULL,
  home_team_id VARCHAR(255) NOT NULL,
  away_team_id VARCHAR(255) NOT NULL,
  ground_id VARCHAR(255) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL, -- scheduled, in_progress, completed, cancelled
  home_score INT,
  away_score INT,
  reservation_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (league_id) REFERENCES leagues(id),
  FOREIGN KEY (ground_id) REFERENCES grounds(id),
  INDEX idx_league (league_id),
  INDEX idx_scheduled (scheduled_at)
);
```

### analytics_events
```sql
CREATE TABLE analytics_events (
  id VARCHAR(255) PRIMARY KEY,
  event_name VARCHAR(50) NOT NULL,
  at TIMESTAMP NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  region VARCHAR(50) NOT NULL,
  device VARCHAR(10) NOT NULL, -- m, pc
  network VARCHAR(20), -- offline, slow, normal
  from_source VARCHAR(20), -- api, seed, cache
  experiment_key VARCHAR(100),
  variant VARCHAR(1), -- A, B
  mode VARCHAR(20), -- default, season
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_event_name (event_name),
  INDEX idx_session (session_id),
  INDEX idx_user (user_id),
  INDEX idx_region_at (region, at),
  INDEX idx_experiment (experiment_key)
);
```

### daily_kpis
```sql
CREATE TABLE daily_kpis (
  id VARCHAR(255) PRIMARY KEY,
  date DATE NOT NULL,
  region VARCHAR(50) NOT NULL,
  story_imp INT DEFAULT 0,
  story_click INT DEFAULT 0,
  story_ctr DECIMAL(5, 2) DEFAULT 0,
  booking_start INT DEFAULT 0,
  payment_success INT DEFAULT 0,
  payment_fail INT DEFAULT 0,
  booking_cr DECIMAL(5, 2) DEFAULT 0,
  revenue BIGINT DEFAULT 0,
  seed_rate DECIMAL(5, 2) DEFAULT 0,
  offline_rate DECIMAL(5, 2) DEFAULT 0,
  api_error INT DEFAULT 0,
  story_fill_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_date_region (date, region),
  INDEX idx_date (date),
  INDEX idx_region (region)
);
```

### settlements
```sql
CREATE TABLE settlements (
  id VARCHAR(255) PRIMARY KEY,
  owner_id VARCHAR(255) NOT NULL,
  region VARCHAR(50) NOT NULL,
  period VARCHAR(50) NOT NULL, -- 2025-02-1w
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total BIGINT NOT NULL,
  fee_total BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL, -- PENDING, APPROVED, PAID, CANCELLED
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_owner (owner_id),
  INDEX idx_region (region),
  INDEX idx_period (period)
);
```

### settlement_items
```sql
CREATE TABLE settlement_items (
  id VARCHAR(255) PRIMARY KEY,
  settlement_id VARCHAR(255) NOT NULL,
  reservation_id VARCHAR(255) NOT NULL,
  amount INT NOT NULL,
  fee_rate DECIMAL(5, 4) NOT NULL,
  fee INT NOT NULL,
  net INT NOT NULL,
  used_at TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL, -- READY, SETTLED, HOLD, CANCELLED
  FOREIGN KEY (settlement_id) REFERENCES settlements(id),
  INDEX idx_settlement (settlement_id),
  INDEX idx_status (status)
);
```

---

## 관계도

```
stories (1) ──┐
              │
grounds (1) ──┼── slots (N)
              │
reservations (1) ── payments (1)
              │
teams (1) ── team_members (N)
              │
leagues (1) ── matches (N)
              │
analytics_events (N) ── daily_kpis (1)
              │
settlements (1) ── settlement_items (N)
```

---

## 인덱스 전략

- **조회 최적화**: region, status, date 조합
- **시간 범위**: start_at, end_at 범위 쿼리
- **지역 기반**: region 인덱스 필수
- **분석 쿼리**: event_name, session_id, user_id

---

## 파티셔닝 (선택)

- `analytics_events`: 월별 파티셔닝
- `daily_kpis`: 월별 파티셔닝
