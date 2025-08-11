/**
 * Google Sheets API 서비스
 */

import {google} from "googleapis";
import {EmployeeResult} from "../types";
import {cleanACGTemplateFileName} from "../utils/fileNameUtils";

/**
 * Google Sheets 서비스 클래스
 */
export class GoogleSheetsService {
  private sheets: any;

  /**
   * GoogleSheetsService 생성자
   */
  constructor() {
    // Firebase Functions에서는 Application Default Credentials 사용
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
    });

    this.sheets = google.sheets({version: "v4", auth});
  }

  /**
   * Google Sheets에 계산 결과 업로드
   * @param {EmployeeResult[]} results - 계산 결과 배열
   * @param {number} sheetYear - 연도
   * @param {number} sheetMonth - 월
   * @param {string} spreadsheetId - 스프레드시트 ID
   * @return {Promise<void>}
   */
  async updateGoogleSheet(
    results: EmployeeResult[],
    sheetYear: number,
    sheetMonth: number,
    spreadsheetId: string
  ): Promise<void> {
    const lastRowIndex = Number(results.length) + 6;
    const range = `${sheetYear}년 ${sheetMonth}월!A4:J${lastRowIndex}`;

    console.log("Google Sheets 업데이트 시작:", {
      spreadsheetId,
      range,
      resultsCount: results.length,
    });


    const values = results.map((result, index) => [
      index + 1, // No.
      cleanACGTemplateFileName(result.name, sheetYear, sheetMonth), // 이름
      result.workDay, // 근무일
      result.holiday, // 휴일
      result.weekendWork, // 주말근무
      result.total, // 총금액
      result.usedAmount, // 사용금액
      result.balance, // 잔여금액
      "", // 정산여부
      `=HYPERLINK("${result.downloadUrl}", "엑셀파일 다운로드")`, // 다운로드 링크
    ]);

    console.log("업로드할 데이터 샘플:", values.slice(0, 2));

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        resource: {values},
        valueInputOption: "USER_ENTERED",
      });

      console.log("Google Sheet 업데이트 성공", {
        updatedRows: values.length,
        range,
      });
    } catch (error) {
      console.error("Google Sheet 업데이트 에러:", error);
      throw new Error(`Google Sheets 업데이트 실패: ${error}`);
    }
  }

  /**
   * 시트 존재 여부 확인
   * @param {string} spreadsheetId - 스프레드시트 ID
   * @param {string} sheetName - 시트명
   * @return {Promise<boolean>} 시트 존재 여부
   */
  async checkSheetExists(spreadsheetId: string, sheetName: string): Promise<boolean> {
    try {
      console.log("sheetName:", sheetName);
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      return sheets.some((sheet: any) => sheet.properties?.title === sheetName);
    } catch (error) {
      console.error("시트 존재 확인 에러:", error);
      return false;
    }
  }

  /**
   * 새 시트 생성
   * @param {string} spreadsheetId - 스프레드시트 ID
   * @param {string} sheetName - 생성할 시트명
   * @return {Promise<void>}
   */
  async createSheet(spreadsheetId: string, sheetName: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      console.log(`시트 '${sheetName}' 생성 완료`);

      // 헤더 추가
      await this.addHeaders(spreadsheetId, sheetName);
    } catch (error) {
      console.error("시트 생성 에러:", error);
      throw new Error(`시트 생성 실패: ${error}`);
    }
  }

  /**
   * 시트에 헤더 추가
   * @param {string} spreadsheetId - 스프레드시트 ID
   * @param {string} sheetName - 시트명
   * @return {Promise<void>}
   */
  private async addHeaders(spreadsheetId: string, sheetName: string): Promise<void> {
    const headerValues = [["No.", "성명", "근무일", "휴일", "주말근무", "총금액", "사용금액", "잔여금액", "정산여부", "엑셀파일"]];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A3:J3`,
      resource: {values: headerValues},
      valueInputOption: "USER_ENTERED",
    });

    console.log(`시트 '${sheetName}'에 헤더 추가 완료`);
  }

  /**
   * Google Sheets 업데이트 (시트 자동 생성 포함)
   * @param {EmployeeResult[]} results - 계산 결과 배열
   * @param {number} sheetYear - 연도
   * @param {number} sheetMonth - 월
   * @param {string} spreadsheetId - 스프레드시트 ID
   * @return {Promise<void>}
   */
  async updateGoogleSheetWithAutoCreate(
    results: EmployeeResult[],
    sheetYear: number,
    sheetMonth: number,
    spreadsheetId: string
  ): Promise<void> {
    const sheetName = `${sheetYear}년 ${sheetMonth}월`;
    console.log("sheetName:", sheetName);

    console.log("spreadsheetId:", spreadsheetId);
    // 시트 존재 확인
    const exists = await this.checkSheetExists(spreadsheetId, sheetName);

    if (!exists) {
      console.log(`시트 '${sheetName}'가 존재하지 않아 생성합니다.`);
      await this.createSheet(spreadsheetId, sheetName);
    }

    // 데이터 업로드
    await this.updateGoogleSheet(results, sheetYear, sheetMonth, spreadsheetId);
  }
}
