# 급식비 정산 시스템 (ACG Meal Service)

> Firebase Functions와 Google Sheets를 활용한 급식비 계산 및 정산 자동화 시스템

## 🎯 프로젝트 개요

급식 업체의 월별 급식비 정산 업무를 자동화하는 백엔드 서비스입니다. Excel 파일을 자동으로 처리하여 개별 식사 수를 계산하고, Google Sheets에 결과를 동기화합니다.

## 🛠 기술 스택

### Backend
- **Runtime**: Node.js 22
- **Framework**: Firebase Functions v2
- **Language**: TypeScript (strict mode)
- **Architecture**: Clean Architecture 적용

### APIs & Services
- **Google Sheets API**: 계산 결과 자동 동기화
- **Firebase Storage**: Excel 파일 관리 및 ZIP 압축
- **ExcelJS**: Excel 파일 데이터 추출

### DevOps
- **Cloud Platform**: Firebase (Google Cloud)
- **CI/CD**: Firebase Deploy with ESLint validation
- **Code Quality**: ESLint with Google Style Guide

## 📂 프로젝트 구조

```
├── firebase.json              # Firebase 설정
├── .firebaserc               # 프로젝트 별칭 (acg-playground)
└── functions/
    ├── src/
    │   ├── controllers/      # API 컨트롤러
    │   │   └── calculationController.ts
    │   ├── services/         # 비즈니스 로직
    │   │   ├── calculationService.ts
    │   │   ├── excelService.ts
    │   │   ├── googleSheetsService.ts
    │   │   └── storageService.ts
    │   ├── utils/           # 유틸리티 함수
    │   │   ├── dateUtils.ts
    │   │   ├── fileNameUtils.ts
    │   │   └── validationUtils.ts
    │   ├── types/           # TypeScript 타입 정의
    │   │   └── index.ts
    │   └── index.ts         # Functions 엔트리포인트
    └── lib/                 # 컴파일된 JavaScript (자동 생성)
```

## 🚀 주요 기능

### 1. 급식비 자동 계산 (`/calculateBalance`)
- **입력**: 연도/월 파라미터 (`?sheetYear=2025&sheetMonth=3`)
- **처리**: Firebase Storage에서 Excel 파일 자동 다운로드
- **계산**: 개별 직원 식사 수 집계 및 급식비 계산
- **출력**: Google Sheets 자동 업데이트 + JSON 응답

### 2. 파일 관리 (`/getStorageFile`)
- **압축**: 월별 Excel 파일들을 ZIP으로 자동 압축
- **다운로드**: 압축 파일 다운로드 링크 생성
- **관리**: 파일 개수 및 상태 정보 제공

## 💻 개발 환경 설정

### 필수 요구사항
- Node.js 22+
- Firebase CLI
- Google Cloud 서비스 계정

### 설치 및 실행
```bash
# 의존성 설치
cd functions && npm install

# 개발 서버 시작 (로컬 에뮬레이터)
npm run serve

# 코드 변경 감지 (개발용)
npm run build:watch

# 코드 품질 검사
npm run lint

# 프로덕션 배포
npm run deploy
```

## 🏗 아키텍처 설계

### Clean Architecture 패턴
- **Controllers**: HTTP 요청/응답 처리
- **Services**: 핵심 비즈니스 로직
- **Utils**: 공통 유틸리티 함수
- **Types**: 타입 안전성 보장

### 에러 처리 전략
- 파일별 개별 에러 처리로 시스템 안정성 확보
- 상세한 로깅으로 디버깅 지원
- 사용자 친화적 에러 메시지 제공

## 📊 API 명세

### POST/GET `/calculateBalance`
급식비 계산 및 Google Sheets 동기화

**Parameters:**
- `sheetYear`: 계산 연도 (예: 2025)
- `sheetMonth`: 계산 월 (예: 3)

**Response:**
```json
{
  "results": [...],
  "zipDownloadLink": "폴더 전체 다운로드: 5개 파일",
  "folderName": "2025년 3월",
  "processedFiles": 5,
  "googleSheetsUpdated": true,
  "googleSheetsError": null
}
```

### GET `/getStorageFile`
폴더 ZIP 압축 및 다운로드 링크 생성

**Parameters:**
- `sheetYear`: 대상 연도
- `sheetMonth`: 대상 월

## 🔒 보안 고려사항

- Firebase 서비스 계정 키 관리
- Google Sheets API 권한 제한
- 파일 업로드 제한 및 검증
- CORS 정책 적용

## 📈 성능 최적화

- **메모리 관리**: 대용량 Excel 파일 스트리밍 처리
- **동시 처리**: 다중 파일 병렬 처리
- **캐싱**: Firebase Storage 다운로드 URL 캐싱

## 🧪 테스트 전략

- **Unit Test**: 개별 서비스 로직 테스트
- **Integration Test**: Firebase Functions 통합 테스트
- **E2E Test**: API 엔드포인트 완전 테스트

## 🚀 배포 프로세스

1. **코드 품질 검사**: `npm run lint`
2. **TypeScript 컴파일**: `npm run build`
3. **Firebase 배포**: `npm run deploy`
4. **실시간 로그 모니터링**: `npm run logs`

### 코딩 컨벤션
- Google TypeScript Style Guide 준수
- ESLint 규칙 엄격 적용
- 한글 주석으로 코드 가독성 향상

### 커밋 컨벤션
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 추가
```
