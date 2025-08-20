/**
 * Excel 파일 처리 서비스
 */

import * as ExcelJS from "exceljs";
import {Readable} from "stream";
import {ExcelRowData, CalculationSettings} from "../types";

/**
 * Excel 서비스 클래스
 */
export class ExcelService {
  private static readonly DEFAULT_SETTINGS: CalculationSettings = {
    dailyAmount: 10000,
    sheetName: "내역",
    dataRange: "B3:L204",
  };

  /**
   * Excel 파일 버퍼에서 워크북을 읽어옴
   * @param {Buffer} buffer - Excel 파일 버퍼
   * @return {Promise<ExcelJS.Workbook>} 워크북 객체
   */
  static async readWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    // Convert Buffer to stream for ExcelJS
    const stream = Readable.from(buffer);
    await workbook.xlsx.read(stream);
    return workbook;
  }

  /**
   * 워크북에서 지정된 시트를 가져옴
   * @param {ExcelJS.Workbook} workbook - 워크북 객체
   * @param {string} sheetName - 시트명 (기본: '내역')
   * @return {ExcelJS.Worksheet | null} 워크시트 객체 또는 null
   */
  static getWorksheet(
    workbook: ExcelJS.Workbook,
    sheetName: string = ExcelService.DEFAULT_SETTINGS.sheetName
  ): ExcelJS.Worksheet | null {
    const worksheet = workbook.getWorksheet(sheetName);
    return worksheet || null;
  }

  /**
   * 워크시트에서 데이터를 추출하여 구조화
   * @param {ExcelJS.Worksheet} worksheet - 워크시트 객체
   * @param {string} range - 데이터 범위 (기본: 'B3:L204')
   * @return {ExcelRowData[]} 구조화된 데이터 배열
   */
  static extractData(
    worksheet: ExcelJS.Worksheet,
    range: string = ExcelService.DEFAULT_SETTINGS.dataRange
  ): ExcelRowData[] {
    console.log(`Excel 데이터 추출 시작 - 범위: ${range}`);

    const result: ExcelRowData[] = [];

    // 범위 파싱 (예: "B3:L204" -> {start: {col: 2, row: 3}, end: {col: 12, row: 204}})
    const rangeMatch = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (!rangeMatch) {
      throw new Error(`잘못된 범위 형식: ${range}`);
    }

    const startCol = this.columnToNumber(rangeMatch[1]); // B = 2
    const startRow = parseInt(rangeMatch[2], 10); // 3
    const endRow = parseInt(rangeMatch[4], 10); // 204

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
      const row = worksheet.getRow(rowIndex);

      // 빈 행 건너뛰기
      if (!row || !row.values || (Array.isArray(row.values) && row.values.length <= 1)) continue;

      const yearValue = row.getCell(startCol).value; // B열
      const monthValue = row.getCell(startCol + 1).value; // C열
      const workTypeValue = row.getCell(startCol + 4).value; // F열
      const attendanceValue = row.getCell(startCol + 6).value; // H열
      const amountValue = row.getCell(startCol + 8).value; // J열

      // 디버깅을 위한 상세 로깅
      if (rowIndex - startRow < 3) {
        const i = rowIndex - startRow;
        console.log(`행 ${i} 상세 분석:`);
        console.log(`  B열(년도): '${yearValue}' (타입: ${typeof yearValue})`);
        console.log(`  C열(월): '${monthValue}' (타입: ${typeof monthValue})`);
        console.log(`  F열(업무일): '${workTypeValue}' (타입: ${typeof workTypeValue})`);
        console.log(`  H열(근태): '${attendanceValue}' (타입: ${typeof attendanceValue})`);
        console.log(`  J열(금액): '${amountValue}' (타입: ${typeof amountValue})`);
      }

      // 필수 데이터가 없는 행 건너뛰기
      if (!yearValue || !monthValue) {
        if (rowIndex - startRow < 10) {
          console.log(`행 ${rowIndex - startRow} 건너뛰기: 년도(${yearValue}) 또는 월(${monthValue}) 없음`);
        }
        continue;
      }

      const year = parseInt(String(yearValue), 10);
      const month = parseInt(String(monthValue), 10);
      const amount = parseFloat(String(amountValue || 0));

      if (isNaN(year) || isNaN(month)) {
        console.log(`행 ${rowIndex - startRow} 건너뛰기: 년도(${year}) 또는 월(${month})이 숫자가 아님`);
        continue;
      }

      // 셀 값이 객체인 경우 실제 값 추출
      const getActualValue = (cellValue: unknown): string => {
        if (cellValue === null || cellValue === undefined) return "";
        if (typeof cellValue === "object" && cellValue !== null) {
          const obj = cellValue as Record<string, unknown>;
          if ("text" in obj && obj.text !== undefined) {
            return String(obj.text);
          }
          if ("result" in obj && obj.result !== undefined) {
            return String(obj.result);
          }
          if ("formula" in obj && obj.formula !== undefined) {
            return String(obj.formula);
          }
        }
        return String(cellValue);
      };

      const rowData: ExcelRowData = {
        year,
        month,
        workType: getActualValue(workTypeValue),
        attendance: getActualValue(attendanceValue),
        amount: isNaN(amount) ? 0 : amount,
      };

      result.push(rowData);

      // 처음 몇 개 데이터의 최종 결과 로깅
      if (result.length <= 3) {
        console.log(`변환된 데이터 ${result.length}:`, rowData);
      }
    }

    console.log(`최종 추출된 데이터 개수: ${result.length}`);
    return result;
  }

  /**
   * 엑셀 열 문자를 숫자로 변환 (A=1, B=2, ..., Z=26, AA=27, ...)
   * @param {string} column - 열 문자 (예: "A", "B", "AA")
   * @return {number} 열 번호
   */
  private static columnToNumber(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 64);
    }
    return result;
  }

  /**
   * Excel 파일 전체 처리 파이프라인
   * @param {Buffer} buffer - Excel 파일 버퍼
   * @param {string} sheetName - 시트명
   * @param {string} range - 데이터 범위
   * @return {Promise<ExcelRowData[]>} 처리된 데이터
   */
  static async processExcelFile(buffer: Buffer, sheetName?: string, range?: string): Promise<ExcelRowData[]> {
    const workbook = await this.readWorkbook(buffer);
    const worksheet = this.getWorksheet(workbook, sheetName);

    if (!worksheet) {
      throw new Error(`시트 '${sheetName || this.DEFAULT_SETTINGS.sheetName}'를 찾을 수 없습니다.`);
    }

    return this.extractData(worksheet, range);
  }
}
