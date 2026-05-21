# 📘 OpenAPI 3.0 명세서 (YAGO VIBE API)

**생성일**: 2025-01-27  
**버전**: 1.0.0  
**목적**: Policy Engine 중심 API 계약 정의

---

## OpenAPI 문서 (YAML)

```yaml
openapi: 3.0.3
info:
  title: YAGO VIBE API
  description: |
    AI 기반 스포츠 조직 운영 플랫폼 YAGO VIBE의 API 명세서
    
    ## 핵심 원칙
    - 권한 판단은 서버 단에서 단일 책임
    - 프론트는 결과만 소비
    - 정책 기반 권한 관리 (매트릭스)
    
    ## 인증
    모든 API는 Firebase Authentication JWT 토큰을 Bearer 토큰으로 전달해야 합니다.
  version: 1.0.0
  contact:
    name: YAGO VIBE API Support
    email: support@yagovibe.com

servers:
  - url: https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
    description: Production Server
  - url: http://localhost:5001/yago-vibe-spt/asia-northeast3
    description: Local Emulator

tags:
  - name: Policy
    description: 권한 정책 관련 API
  - name: Teams
    description: 팀 관리 API
  - name: Facilities
    description: 시설 관리 API
  - name: Bookings
    description: 대관 관리 API

paths:
  /api/policy/booking-permission:
    post:
      tags:
        - Policy
      summary: 대관 권한 조회
      description: |
        팀 상태와 시설 정책을 기반으로 대관 권한을 조회합니다.
        정책 매트릭스를 사용하여 O(1) 시간 복잡도로 권한을 결정합니다.
      operationId: getBookingPermission
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BookingPermissionRequest'
            example:
              teamId: "team-123"
              facilityId: "facility-456"
              dateTime: "2025-01-27T09:00:00Z"
      responses:
        '200':
          description: 권한 조회 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BookingPermissionResponse'
              examples:
                member_association_priority:
                  summary: 회원팀 - 협회 우선 시설
                  value:
                    success: true
                    actionType: "APPLY"
                    reasonCode: "MEMBER_ASSOCIATION_PRIORITY"
                    message: "우선 배정 대상입니다"
                    showConversionCTA: false
                non_member_association_priority:
                  summary: 비회원팀 - 협회 우선 시설
                  value:
                    success: true
                    actionType: "VIEW_ONLY"
                    reasonCode: "NON_MEMBER_ASSOCIATION_PRIORITY"
                    message: "잔여 시간대만 이용 가능"
                    showConversionCTA: true
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /api/teams/{teamId}:
    get:
      tags:
        - Teams
      summary: 팀 정보 조회
      description: 팀 상태 및 기본 정보를 조회합니다.
      operationId: getTeam
      security:
        - BearerAuth: []
      parameters:
        - name: teamId
          in: path
          required: true
          schema:
            type: string
          description: 팀 ID
      responses:
        '200':
          description: 팀 정보 조회 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TeamResponse'
              example:
                id: "team-123"
                name: "동부FC"
                status: "NON_MEMBER"
                associationId: "assoc-1"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/teams/{teamId}/conversion:
    post:
      tags:
        - Teams
      summary: 회원팀 전환 문의
      description: |
        비회원팀이 회원팀으로 전환을 요청합니다.
        상태가 NON_MEMBER → PENDING으로 변경됩니다.
      operationId: requestTeamConversion
      security:
        - BearerAuth: []
      parameters:
        - name: teamId
          in: path
          required: true
          schema:
            type: string
          description: 팀 ID
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConversionRequest'
            example:
              memo: "협회 우선 대관 시설 이용을 위해 전환 신청합니다."
      responses:
        '200':
          description: 전환 문의 접수 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConversionResponse'
              example:
                success: true
                newStatus: "PENDING"
                requestedAt: "2025-01-27T10:30:00Z"
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 이미 전환 문의 중이거나 회원팀입니다
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/teams/{teamId}/approve:
    post:
      tags:
        - Teams
      summary: 회원팀 전환 승인
      description: |
        협회 관리자가 전환 문의를 승인합니다.
        상태가 PENDING → MEMBER로 변경되고, 권한이 즉시 반영됩니다.
      operationId: approveTeamMembership
      security:
        - BearerAuth: []
      parameters:
        - name: teamId
          in: path
          required: true
          schema:
            type: string
          description: 팀 ID
      responses:
        '200':
          description: 전환 승인 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TeamStatusResponse'
              example:
                success: true
                teamId: "team-123"
                newStatus: "MEMBER"
                updatedAt: "2025-01-27T11:00:00Z"
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          description: 협회 관리자 권한이 필요합니다
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/facilities/{facilityId}:
    get:
      tags:
        - Facilities
      summary: 시설 정보 조회
      description: 시설 정보 및 접근 정책을 조회합니다.
      operationId: getFacility
      security:
        - BearerAuth: []
      parameters:
        - name: facilityId
          in: path
          required: true
          schema:
            type: string
          description: 시설 ID
      responses:
        '200':
          description: 시설 정보 조회 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FacilityResponse'
              example:
                id: "facility-456"
                name: "육군사관학교 축구장"
                location: "서울특별시 노원구 공릉로 574"
                surfaceType: "ARTIFICIAL"
                accessPolicy: "ASSOCIATION_PRIORITY"
                imageUrl: "https://example.com/image.jpg"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Firebase Authentication JWT Token

  schemas:
    TeamStatus:
      type: string
      enum:
        - MEMBER
        - NON_MEMBER
        - ACADEMY
        - PENDING
      description: |
        팀 상태
        - MEMBER: 회원팀 (연 240만원 납부, 운동장 우선 대관)
        - NON_MEMBER: 비회원팀 (회비 없음, 잔여 대관만 가능)
        - ACADEMY: 아카데미/파트너 (비회원, 발전기금 100~200만원)
        - PENDING: 전환 문의 중 (비회원 → 회원 전환 요청 접수됨)

    FacilityAccessPolicy:
      type: string
      enum:
        - ASSOCIATION_PRIORITY
        - ASSOCIATION_MANAGED
        - PUBLIC_OPEN
      description: |
        시설 접근 정책
        - ASSOCIATION_PRIORITY: 협회 우선 대관 (육사/경기기계공고/과기대)
        - ASSOCIATION_MANAGED: 협회 배정 (아카데미 대상)
        - PUBLIC_OPEN: 일반 공공 (모든 팀 동일 접근)

    BookingActionType:
      type: string
      enum:
        - APPLY
        - REQUEST
        - WAITLIST
        - VIEW_ONLY
      description: |
        대관 권한 액션 타입
        - APPLY: 대관 신청 가능 (회원팀의 모든 시설, 일반 시설)
        - REQUEST: 협회 승인 요청 (아카데미의 협회 배정 시설)
        - WAITLIST: 대기 신청 (비회원팀의 협회 배정 시설)
        - VIEW_ONLY: 보기만 가능 (비회원팀의 협회 우선 시설, 전환 문의 중)

    BookingPermissionRequest:
      type: object
      required:
        - teamId
        - facilityId
      properties:
        teamId:
          type: string
          description: 팀 ID
          example: "team-123"
        facilityId:
          type: string
          description: 시설 ID
          example: "facility-456"
        dateTime:
          type: string
          format: date-time
          description: 대관 일시 (ISO 8601, 선택)
          example: "2025-01-27T09:00:00Z"

    BookingPermissionResponse:
      type: object
      required:
        - success
        - actionType
        - reasonCode
      properties:
        success:
          type: boolean
          description: 성공 여부
          example: true
        actionType:
          $ref: '#/components/schemas/BookingActionType'
        reasonCode:
          type: string
          description: |
            권한 결정 이유 코드 (UI 메시지 매핑용)
            형식: {TeamStatus}_{FacilityAccessPolicy}
          example: "NON_MEMBER_ASSOCIATION_PRIORITY"
        message:
          type: string
          description: 사용자에게 표시할 메시지
          example: "잔여 시간대만 이용 가능"
        showConversionCTA:
          type: boolean
          description: 회원팀 전환 CTA 표시 여부
          example: true
        teamStatus:
          $ref: '#/components/schemas/TeamStatus'
          description: 현재 팀 상태 (디버깅용)
        facilityPolicy:
          $ref: '#/components/schemas/FacilityAccessPolicy'
          description: 시설 접근 정책 (디버깅용)

    TeamResponse:
      type: object
      required:
        - id
        - name
        - status
      properties:
        id:
          type: string
          description: 팀 ID
          example: "team-123"
        name:
          type: string
          description: 팀명
          example: "동부FC"
        status:
          $ref: '#/components/schemas/TeamStatus'
        associationId:
          type: string
          nullable: true
          description: 협회 ID (소속인 경우)
          example: "assoc-1"
        conversionRequest:
          type: object
          nullable: true
          description: 전환 문의 정보 (PENDING 상태일 때)
          properties:
            requestedAt:
              type: string
              format: date-time
              description: 전환 문의 일시
            memo:
              type: string
              nullable: true
              description: 추가 메모
            requestedBy:
              type: string
              description: 요청한 사용자 ID

    ConversionRequest:
      type: object
      properties:
        memo:
          type: string
          nullable: true
          description: 추가 메모 (선택)
          example: "협회 우선 대관 시설 이용을 위해 전환 신청합니다."

    ConversionResponse:
      type: object
      required:
        - success
        - newStatus
        - requestedAt
      properties:
        success:
          type: boolean
          description: 성공 여부
          example: true
        newStatus:
          $ref: '#/components/schemas/TeamStatus'
          description: 새로운 팀 상태 (PENDING)
        requestedAt:
          type: string
          format: date-time
          description: 전환 문의 접수 일시
          example: "2025-01-27T10:30:00Z"

    TeamStatusResponse:
      type: object
      required:
        - success
        - teamId
        - newStatus
        - updatedAt
      properties:
        success:
          type: boolean
          description: 성공 여부
          example: true
        teamId:
          type: string
          description: 팀 ID
          example: "team-123"
        newStatus:
          $ref: '#/components/schemas/TeamStatus'
          description: 새로운 팀 상태
        updatedAt:
          type: string
          format: date-time
          description: 상태 변경 일시
          example: "2025-01-27T11:00:00Z"

    FacilityResponse:
      type: object
      required:
        - id
        - name
        - accessPolicy
      properties:
        id:
          type: string
          description: 시설 ID
          example: "facility-456"
        name:
          type: string
          description: 시설명
          example: "육군사관학교 축구장"
        location:
          type: string
          nullable: true
          description: 위치
          example: "서울특별시 노원구 공릉로 574"
        surfaceType:
          type: string
          enum:
            - ARTIFICIAL
            - NATURAL
          description: 잔디 타입
          example: "ARTIFICIAL"
        accessPolicy:
          $ref: '#/components/schemas/FacilityAccessPolicy'
        imageUrl:
          type: string
          nullable: true
          format: uri
          description: 시설 이미지 URL
        description:
          type: string
          nullable: true
          description: 시설 설명

    ErrorResponse:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
          description: 에러 코드
          example: "INVALID_ARGUMENT"
        message:
          type: string
          description: 에러 메시지
          example: "teamId와 facilityId가 필요합니다."
        details:
          type: object
          nullable: true
          description: 추가 에러 정보

  responses:
    BadRequest:
      description: 잘못된 요청
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error: "INVALID_ARGUMENT"
            message: "teamId와 facilityId가 필요합니다."

    Unauthorized:
      description: 인증이 필요합니다
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error: "UNAUTHENTICATED"
            message: "로그인이 필요합니다."

    NotFound:
      description: 리소스를 찾을 수 없습니다
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error: "NOT_FOUND"
            message: "팀을 찾을 수 없습니다."

    InternalServerError:
      description: 서버 내부 오류
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error: "INTERNAL"
            message: "대관 권한 조회 중 오류가 발생했습니다."
```

---

## 정책 매트릭스 (참고)

```
                    ASSOCIATION_PRIORITY  |  ASSOCIATION_MANAGED  |  PUBLIC_OPEN
MEMBER              APPLY                 |  APPLY                |  APPLY
ACADEMY             REQUEST               |  REQUEST              |  APPLY
NON_MEMBER          VIEW_ONLY             |  WAITLIST             |  APPLY
PENDING             VIEW_ONLY             |  WAITLIST             |  APPLY
```

---

## UX 메시지 매핑 (프론트엔드 참고)

```typescript
const REASON_MESSAGE_MAP = {
  NON_MEMBER_ASSOCIATION_PRIORITY: "잔여 시간대만 이용 가능",
  NON_MEMBER_ASSOCIATION_MANAGED: "잔여 시간대만 이용 가능",
  ACADEMY_ASSOCIATION_PRIORITY: "협회 선대관 일정 내 배정됩니다",
  ACADEMY_ASSOCIATION_MANAGED: "협회 선대관 일정 내 배정됩니다",
  MEMBER_ASSOCIATION_PRIORITY: "우선 배정 대상입니다",
  MEMBER_ASSOCIATION_MANAGED: "우선 배정 대상입니다",
  MEMBER_PUBLIC_OPEN: "대관 신청 가능",
  ACADEMY_PUBLIC_OPEN: "대관 신청 가능",
  NON_MEMBER_PUBLIC_OPEN: "대관 신청 가능",
  PENDING_ASSOCIATION_PRIORITY: "전환 문의 처리 중입니다",
  PENDING_ASSOCIATION_MANAGED: "전환 문의 처리 중입니다",
  PENDING_PUBLIC_OPEN: "대관 신청 가능",
} as const;
```

---

## 로그 & 운영 포인트

### 비회원 VIEW_ONLY 접근 로그

```
{
  event: "BOOKING_PERMISSION_CHECKED",
  teamId: "team-123",
  facilityId: "facility-456",
  actionType: "VIEW_ONLY",
  reasonCode: "NON_MEMBER_ASSOCIATION_PRIORITY",
  timestamp: "2025-01-27T10:00:00Z"
}
```

### 협회 리포트 예시

```
"육사 시설 접근 시도 중 43%가 비회원"
→ 운영 데이터 = 다음 설득 자료
```

---

## ✅ 검증 완료

### 반드시 지켜야 할 것

- ✅ UX ↔ 정책 ↔ 데이터 완전 분리
- ✅ 시설 추가/정책 변경 무중단
- ✅ 협회 운영 규칙이 코드로 고정
- ✅ O(1) 시간 복잡도 권한 조회

### 하지 말 것

- ❌ 하드코딩된 조건문
- ❌ if/else 기반 권한 판단
- ❌ 프론트엔드에서 권한 계산

---

**이 OpenAPI 명세는 프론트/백엔드 동시 개발 가능한 수준의 상세한 API 계약을 포함합니다.**

