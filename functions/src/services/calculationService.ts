/**
 * 급여 계산 로직 서비스
 */

import {ExcelRowData, EmployeeResult} from "../types";
import {cleanACGTemplateFileName} from "../utils/fileNameUtils";

/**
 * 급여 계산 서비스 클래스
 */
export class CalculationService {
  private static readonly DAILY_AMOUNT = 10000;

  /**
   * 특정 월의 근무일 수 계산
   * 조건: 업무일(F열)이 '업무일'인 경우
   * @param {ExcelRowData[]} data - Excel 데이터
   * @param {number} targetMonth - 대상 월
   * @return {number} 근무일 수
   */
  static calculateWorkDays(data: ExcelRowData[], targetMonth: number): number {
    const workDays = data.filter((row) => row.month === targetMonth && row.workType === "업무일");
    return workDays.length;
  }

  /**
   * 특정 월의 휴일근무 수 계산
   * 조건: 업무일(F열)이 '휴일'이면서 근태(H열)가 '근무'인 경우
   * @param {ExcelRowData[]} data - Excel 데이터
   * @param {number} targetMonth - 대상 월
   * @return {number} 휴일근무 수
   */
  static calculateWeekendWork(data: ExcelRowData[], targetMonth: number): number {
    const weekendWork = data.filter((row) =>
      row.month === targetMonth && row.workType === "휴일" && row.attendance === "근무");
    return weekendWork.length;
  }

  /**
   * 특정 월의 휴가일 수 계산
   * @param {ExcelRowData[]} data - Excel 데이터
   * @param {number} targetMonth - 대상 월
   * @return {number} 휴가일 수
   */
  static calculateHolidays(data: ExcelRowData[], targetMonth: number): number {
    const holidays = data.filter((row) => row.month === targetMonth && row.attendance.includes("휴무"));
    return holidays.length;
  }

  /**
   * 특정 월의 총 사용 금액 계산
   * @param {ExcelRowData[]} data - Excel 데이터
   * @param {number} targetMonth - 대상 월
   * @return {number} 총 사용 금액
   */
  static calculateUsedAmount(data: ExcelRowData[], targetMonth: number): number {
    const monthData = data.filter((row) => row.month === targetMonth);
    const total = monthData.reduce((sum, row) => sum + row.amount, 0);
    return total;
  }

  /**
   * 사용가능 총 금액 계산
   * @param {number} workDays - 근무일 수
   * @param {number} weekendWork - 휴일근무 수
   * @param {number} holidays - 휴가일 수
   * @return {number} 사용가능 총 금액
   */
  static calculateTotalAmount(workDays: number, weekendWork: number, holidays: number): number {
    return workDays * this.DAILY_AMOUNT + weekendWork * this.DAILY_AMOUNT - holidays * this.DAILY_AMOUNT;
  }

  /**
   * 직원별 전체 계산 수행
   * @param {ExcelRowData[]} data - Excel 데이터
   * @param {string} employeeName - 직원명
   * @param {number} targetYear - 대상 월
   * @param {number} targetMonth - 대상 월
   * @param {string} downloadUrl - 파일 다운로드 URL
   * @return {EmployeeResult} 계산 결과
   */
  static calculateEmployee(
    data: ExcelRowData[], employeeName: string, targetYear:number, targetMonth: number, downloadUrl: string
  ): EmployeeResult {
    const workDay = this.calculateWorkDays(data, targetMonth);
    const weekendWork = this.calculateWeekendWork(data, targetMonth);
    const holiday = this.calculateHolidays(data, targetMonth);
    const usedAmount = this.calculateUsedAmount(data, targetMonth);
    const total = this.calculateTotalAmount(workDay, weekendWork, holiday);
    const balance = total - usedAmount;


    const cleanedName = cleanACGTemplateFileName(employeeName, targetYear, targetMonth);
    console.log(`cleanACGTemplateFileName 처리: "${employeeName}" -> "${cleanedName}"`);

    return {
      name: cleanedName,
      workDay,
      holiday,
      weekendWork,
      total,
      balance,
      usedAmount,
      downloadUrl,
    };
  }

  /**
   * 여러 직원 데이터 일괄 계산
   * @param {Map<string, ExcelRowData[]>} employeeDataMap - 직원별 데이터 맵
   * @param {Map<string, string>} downloadUrlMap - 직원별 다운로드 URL 맵
   * @param {number} targetYear - 대상 연도
   * @param {number} targetMonth - 대상 월
   * @return {EmployeeResult[]} 모든 직원의 계산 결과
   */
  static calculateAllEmployees(
    employeeDataMap: Map<string, ExcelRowData[]>,
    downloadUrlMap: Map<string, string>,
    targetYear: number,
    targetMonth: number
  ): EmployeeResult[] {
    const results: EmployeeResult[] = [];

    employeeDataMap.forEach((data, employeeName) => {
      const downloadUrl = downloadUrlMap.get(employeeName) || "";
      const result = this.calculateEmployee(data, employeeName, targetYear, targetMonth, downloadUrl);
      results.push(result);
    });

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }
}
