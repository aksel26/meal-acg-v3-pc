/**
 * Excel 파일 처리 서비스
 */

import * as XLSX from "xlsx";
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
   * @return {XLSX.WorkBook} 워크북 객체
   */
  static readWorkbook(buffer: Buffer): XLSX.WorkBook {
    return XLSX.read(buffer, {type: "buffer"});
  }

  /**
   * 워크북에서 지정된 시트를 가져옴
   * @param {XLSX.WorkBook} workbook - 워크북 객체
   * @param {string} sheetName - 시트명 (기본: '내역')
   * @return {XLSX.WorkSheet | null} 워크시트 객체 또는 null
   */
  static getWorksheet(
    workbook: XLSX.WorkBook,
    sheetName: string = ExcelService.DEFAULT_SETTINGS.sheetName
  ): XLSX.WorkSheet | null {
    if (!workbook.Sheets[sheetName]) {
      return null;
    }
    return workbook.Sheets[sheetName];
  }

  /**
   * 워크시트에서 데이터를 추출하여 구조화
   * @param {XLSX.WorkSheet} worksheet - 워크시트 객체
   * @param {string} range - 데이터 범위 (기본: 'B3:L204')
   * @return {ExcelRowData[]} 구조화된 데이터 배열
   */
  static extractData(
    worksheet: XLSX.WorkSheet,
    range: string = ExcelService.DEFAULT_SETTINGS.dataRange
  ): ExcelRowData[] {
    console.log(`Excel 데이터 추출 시작 - 범위: ${range}`);

    // 먼저 전체 시트를 JSON으로 변환해서 구조 확인

    // 지정된 범위의 데이터 추출
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      range: range,
      header: 1,
      defval: "",
    }) as (string | number)[][];

    const result: ExcelRowData[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      // 빈 행 건너뛰기
      if (!row || row.length === 0) continue;

      const yearValue = row[0]; // B열 (인덱스 0)
      const monthValue = row[1]; // C열 (인덱스 1)
      const workTypeValue = row[4]; // F열 (인덱스 4)
      const attendanceValue = row[6]; // H열 (인덱스 6)
      const amountValue = row[8]; // J열 (인덱스 8)

      // 디버깅을 위한 상세 로깅
      if (i < 3) {
        console.log(`행 ${i} 상세 분석:`);
        console.log(`  B열(년도): '${yearValue}' (타입: ${typeof yearValue})`);
        console.log(`  C열(월): '${monthValue}' (타입: ${typeof monthValue})`);
        console.log(`  F열(업무일): '${workTypeValue}' (타입: ${typeof workTypeValue})`);
        console.log(`  H열(근태): '${attendanceValue}' (타입: ${typeof attendanceValue})`);
        console.log(`  J열(금액): '${amountValue}' (타입: ${typeof amountValue})`);
      }

      // 필수 데이터가 없는 행 건너뛰기
      if (!yearValue || !monthValue) {
        if (i < 10) {
          console.log(`행 ${i} 건너뛰기: 년도(${yearValue}) 또는 월(${monthValue}) 없음`);
        }
        continue;
      }

      const year = parseInt(String(yearValue), 10);
      const month = parseInt(String(monthValue), 10);
      const amount = parseFloat(String(amountValue || 0));

      if (isNaN(year) || isNaN(month)) {
        console.log(`행 ${i} 건너뛰기: 년도(${year}) 또는 월(${month})이 숫자가 아님`);
        continue;
      }

      const rowData: ExcelRowData = {
        year,
        month,
        workType: String(workTypeValue || ""),
        attendance: String(attendanceValue || ""),
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
   * Excel 파일 전체 처리 파이프라인
   * @param {Buffer} buffer - Excel 파일 버퍼
   * @param {string} sheetName - 시트명
   * @param {string} range - 데이터 범위
   * @return {ExcelRowData[]} 처리된 데이터
   */
  static processExcelFile(buffer: Buffer, sheetName?: string, range?: string): ExcelRowData[] {
    const workbook = this.readWorkbook(buffer);
    const worksheet = this.getWorksheet(workbook, sheetName);

    if (!worksheet) {
      throw new Error(`시트 '${sheetName || this.DEFAULT_SETTINGS.sheetName}'를 찾을 수 없습니다.`);
    }

    return this.extractData(worksheet, range);
  }
}
