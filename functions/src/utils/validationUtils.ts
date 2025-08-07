/**
 * 입력값 검증 유틸리티 함수들
 */

/**
 * 쿼리 파라미터 유효성 검사
 * @param {string} sheetYear - 연도 문자열
 * @param {string} sheetMonth - 월 문자열
 * @return {object} 검증 결과
 */
export function validateQueryParams(sheetYear: string, sheetMonth: string) {
  if (!sheetYear || !sheetMonth) {
    return {
      isValid: false,
      error: "sheetYear와 sheetMonth 파라미터가 필요합니다.",
    };
  }

  const year = parseInt(sheetYear, 10);
  const month = parseInt(sheetMonth, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return {
      isValid: false,
      error: "올바른 연도와 월을 입력해주세요. (월: 1-12)",
    };
  }

  return {
    isValid: true,
    year,
    month,
  };
}

/**
 * Excel 파일 확장자 검사
 * @param {string} filename - 파일명
 * @return {boolean} Excel 파일 여부
 */
export function isExcelFile(filename: string): boolean {
  const excelExtensions = [".xlsx", ".xls"];
  return excelExtensions.some((ext) =>
    filename.toLowerCase().endsWith(ext)
  );
}

/**
 * 직원 이름을 파일명에서 추출
 * @param {string} filename - 파일명
 * @return {string} 직원 이름
 */
export function extractEmployeeName(filename: string): string {
  // 파일명에서 확장자 제거 후 폴더 경로 제거
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  const pathParts = nameWithoutExt.split("/");
  return pathParts[pathParts.length - 1];
}
