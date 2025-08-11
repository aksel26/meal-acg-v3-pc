/**
 * 파일명 처리 유틸리티 함수들
 */

/**
 * ACG 템플릿 파일명에서 사용자 이름 추출
 * @param {string} fileName - 파일명
 * @return {string} 추출된 사용자 이름
 */
export function cleanACGTemplateFileName(fileName: string): string {
  let cleanedName = fileName;

  // 확장자 제거
  cleanedName = removeFileExtension(cleanedName);

  if (cleanedName) {
    cleanedName = cleanedName.split("_").pop() || cleanedName;
  } else {
    cleanedName = fileName;
  }
  // 템플릿 접두사 제거 (연도/월 정보가 있는 경우 동적으로, 없으면 기본값 사용)


  return cleanedName;
}

/**
 * 파일명에서 여러 문자열 제거
 * @param {string} fileName - 원본 파일명
 * @param {string[]} stringsToRemove - 제거할 문자열 배열
 * @return {string} 처리된 파일명
 */
export function removeStringsFromFileName(fileName: string, stringsToRemove: string[]): string {
  let result = fileName;
  for (const str of stringsToRemove) {
    result = result.replace(str, "");
  }
  return result;
}

/**
 * 파일 확장자 제거
 * @param {string} fileName - 파일명
 * @return {string} 확장자가 제거된 파일명
 */
export function removeFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return fileName;
  }
  return fileName.substring(0, lastDotIndex);
}

/**
 * 접두사와 접미사 제거
 * @param {string} input - 입력 문자열
 * @param {string} prefix - 제거할 접두사
 * @param {string} suffix - 제거할 접미사
 * @return {string} 처리된 문자열
 */
export function removePrefixAndSuffix(input: string, prefix: string, suffix: string): string {
  let result = input;

  if (result.startsWith(prefix)) {
    result = result.substring(prefix.length);
  }

  if (result.endsWith(suffix)) {
    result = result.substring(0, result.length - suffix.length);
  }

  return result;
}
