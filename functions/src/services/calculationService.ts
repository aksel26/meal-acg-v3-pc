/**
 * 급여 계산 로직 서비스
 */

import { ExcelRowData, EmployeeResult } from "../types";

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
    console.log(`근무일 계산: 월=${targetMonth}, 업무일='업무일' 조건 - ${workDays.length}개 발견`);
    if (workDays.length > 0) {
      console.log(
        "근무일 샘플:",
        workDays.slice(0, 2).map((r) => `${r.year}/${r.month} 업무일:'${r.workType}' 근태:'${r.attendance}'`)
      );
    }
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
    const weekendWork = data.filter((row) => row.month === targetMonth && row.workType === "휴일" && row.attendance === "근무");
    console.log(`휴일근무 계산: 월=${targetMonth}, 업무일='휴일' AND 근태='근무' 조건 - ${weekendWork.length}개 발견`);
    if (weekendWork.length > 0) {
      console.log(
        "휴일근무 샘플:",
        weekendWork.slice(0, 2).map((r) => `${r.year}/${r.month} 업무일:'${r.workType}' 근태:'${r.attendance}'`)
      );
    }
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
    console.log(`휴가일 계산: 월=${targetMonth}, 근태에 '휴무' 포함 조건 - ${holidays.length}개 발견`);
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
    console.log(`사용금액 계산: 월=${targetMonth} 데이터 ${monthData.length}개, 총액=${total}원`);
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
   * @param {number} targetMonth - 대상 월
   * @return {EmployeeResult} 계산 결과
   */
  static calculateEmployee(data: ExcelRowData[], employeeName: string, targetMonth: number): EmployeeResult {
    console.log(`\n=== ${employeeName} 계산 시작 (대상월: ${targetMonth}) ===`);
    console.log(`전체 데이터 개수: ${data.length}`);

    // 대상월 데이터만 필터링하여 확인
    const monthData = data.filter((row) => row.month === targetMonth);
    console.log(`대상월(${targetMonth}) 데이터 개수: ${monthData.length}`);

    if (monthData.length > 0) {
      console.log("대상월 데이터 샘플 (처음 3개):");
      monthData.slice(0, 3).forEach((row, idx) => {
        console.log(`  ${idx + 1}: 년도=${row.year}, 월=${row.month}, 업무일='${row.workType}', 근태='${row.attendance}', 금액=${row.amount}`);
      });
    }

    console.log("dat🫠a:", data);
    const workDay = this.calculateWorkDays(data, targetMonth);
    const weekendWork = this.calculateWeekendWork(data, targetMonth);
    const holiday = this.calculateHolidays(data, targetMonth);
    const usedAmount = this.calculateUsedAmount(data, targetMonth);
    const total = this.calculateTotalAmount(workDay, weekendWork, holiday);
    const balance = total - usedAmount;

    console.log(`계산 결과:`);
    console.log(`  근무일: ${workDay}일`);
    console.log(`  휴일근무: ${weekendWork}일`);
    console.log(`  휴가일: ${holiday}일`);
    console.log(`  사용가능금액: ${total}원`);
    console.log(`  실제사용금액: ${usedAmount}원`);
    console.log(`  잔액: ${balance}원`);

    return {
      name: employeeName,
      workDay,
      holiday,
      weekendWork,
      total,
      balance,
      usedAmount,
    };
  }

  /**
   * 여러 직원 데이터 일괄 계산
   * @param {Map<string, ExcelRowData[]>} employeeDataMap - 직원별 데이터 맵
   * @param {number} targetMonth - 대상 월
   * @return {EmployeeResult[]} 모든 직원의 계산 결과
   */
  static calculateAllEmployees(employeeDataMap: Map<string, ExcelRowData[]>, targetMonth: number): EmployeeResult[] {
    const results: EmployeeResult[] = [];

    employeeDataMap.forEach((data, employeeName) => {
      const result = this.calculateEmployee(data, employeeName, targetMonth);
      results.push(result);
    });

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }
}
