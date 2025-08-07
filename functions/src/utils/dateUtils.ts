/**
 * 날짜 관련 유틸리티 함수들
 */

/**
 * 월을 기준으로 상반기 또는 하반기를 구분하는 함수
 * @param {number} month - 월 (1-12)
 * @return {string} 상반기 또는 하반기
 */
export function getHalfYear(month: number): string {
  return month <= 6 ? "상반기" : "하반기";
}

/**
 * 연도와 월을 기준으로 폴더명을 생성하는 함수
 * @param {number} year - 연도
 * @param {number} month - 월 (1-12)
 * @return {string} 폴더명 (예: "2025 상반기")
 */
export function createFolderName(year: number, month: number): string {
  const halfYear = getHalfYear(month);
  return `${year} ${halfYear}`;
}

/**
 * 연도와 월 유효성 검사
 * @param {number} year - 연도
 * @param {number} month - 월
 * @return {boolean} 유효성 여부
 */
export function validateDate(year: number, month: number): boolean {
  return !isNaN(year) && !isNaN(month) && month >= 1 && month <= 12;
}
