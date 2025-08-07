/**
 * 직원 급여 계산 관련 타입 정의
 */

/**
 * Excel 시트 데이터 행 인터페이스
 */
export interface ExcelRowData {
  year: number; // B열: 연도
  month: number; // C열: 월
  workType: string; // F열: 업무일 ('휴일' 등)
  attendance: string; // H열: 근태 ('근무', '휴무' 등)
  amount: number; // J열: 사용 금액
}

/**
 * 직원별 계산 결과 인터페이스
 */
export interface EmployeeResult {
  name: string; // 직원 이름 (파일명에서 추출)
  workDay: number; // 근무일 수
  holiday: number; // 휴가일 수
  weekendWork: number; // 휴일근무 수
  total: number; // 사용가능 총 금액
  balance: number; // 잔액
  usedAmount: number; // 실제 사용 금액
}

/**
 * API 응답 인터페이스
 */
export interface CalculationResponse {
  results: EmployeeResult[];
  downloadLinks: string[];
  zipDownloadLink: string;
  folderName: string;
  processedFiles: number;
}

/**
 * Firebase Storage 파일 정보 인터페이스
 */
export interface StorageFileInfo {
  name: string;
  size?: string;
  contentType?: string;
  timeCreated?: string;
  updated?: string;
}

/**
 * API 에러 응답 인터페이스
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}

/**
 * 계산 설정 인터페이스
 */
export interface CalculationSettings {
  dailyAmount: number; // 일일 지급액 (기본 10,000원)
  sheetName: string; // 대상 시트명 (기본 '내역')
  dataRange: string; // 데이터 범위 (기본 'B3:L204')
}
