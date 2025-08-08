/**
 * 급여 계산 API 컨트롤러
 */

import {Request, Response} from "express";
import * as functions from "firebase-functions";
import {StorageService} from "../services/storageService";
import {ExcelService} from "../services/excelService";
import {CalculationService} from "../services/calculationService";
import {GoogleSheetsService} from "../services/googleSheetsService";
import {validateQueryParams, extractEmployeeName} from "../utils/validationUtils";
import {createFolderName} from "../utils/dateUtils";
import {CalculationResponse, ExcelRowData} from "../types";

/**
 * 급여 계산 컨트롤러 클래스
 */
export class CalculationController {
  private storageService: StorageService;
  private googleSheetsService: GoogleSheetsService;

  /**
   * 컨트롤러 생성자
   */
  constructor() {
    this.storageService = new StorageService();
    this.googleSheetsService = new GoogleSheetsService();
  }

  /**
   * 급여 계산 메인 엔드포인트
   * @param {Request} request - Express 요청 객체
   * @param {Response} response - Express 응답 객체
   */
  async calculate(request: Request, response: Response): Promise<void> {
    try {
      // 쿼리 파라미터 검증
      const sheetYear = request.query.sheetYear as string;
      console.log("sheetYear:", sheetYear);
      const sheetMonth = request.query.sheetMonth as string;
      console.log("sheetMonth:", sheetMonth);

      const validation = validateQueryParams(sheetYear, sheetMonth);
      if (!validation.isValid) {
        response.status(400).json({error: validation.error});
        return;
      }

      const {year, month} = validation as { year: number; month: number };

      // 폴더명 생성
      const folderName = createFolderName(year, month);
      console.log("folderName:", folderName);

      functions.logger.info(`Processing calculation for ${folderName}`, {
        year,
        month,
        folderName,
      });

      // Storage에서 Excel 파일 목록 조회
      const excelFiles = await this.storageService.getExcelFiles(folderName);
      console.log("excelFiles:", excelFiles);

      if (excelFiles.length === 0) {
        response.status(404).json({
          error: `${folderName} 폴더에서 Excel 파일을 찾을 수 없습니다.`,
        });
        return;
      }

      // 각 파일 처리 및 계산
      const employeeDataMap = new Map<string, ExcelRowData[]>();
      const downloadUrlMap = new Map<string, string>();

      for (const fileInfo of excelFiles) {
        try {
          functions.logger.info(`Processing file: ${fileInfo.name}`);

          // 파일 다운로드
          const buffer = await this.storageService.downloadFile(fileInfo.name);

          // Excel 데이터 추출
          const excelData = ExcelService.processExcelFile(buffer);
          console.log("excelData:", excelData);

          // 직원명 추출
          const employeeName = extractEmployeeName(fileInfo.name);
          employeeDataMap.set(employeeName, excelData);

          // 다운로드 링크 생성
          const downloadUrl = await this.storageService.getSignedUrl(fileInfo.name);
          downloadUrlMap.set(employeeName, downloadUrl);
        } catch (error) {
          functions.logger.error(`Error processing file ${fileInfo.name}:`, error);
          // 개별 파일 에러는 로그만 남기고 계속 진행
        }
      }

      if (employeeDataMap.size === 0) {
        response.status(500).json({
          error: "처리 가능한 Excel 파일이 없습니다.",
        });
        return;
      }

      // 전체 직원 계산 수행
      const results = CalculationService.calculateAllEmployees(employeeDataMap, downloadUrlMap, month!);

      // ZIP 다운로드 링크 생성 (폴더 전체)
      let zipDownloadLink = "";
      try {
        const allFileLinks = await this.storageService.getAllFileDownloadLinks(folderName);
        zipDownloadLink = allFileLinks.length > 0 ? `폴더 전체 다운로드: ${allFileLinks.length}개 파일` : "";
      } catch (error) {
        functions.logger.warn("ZIP 다운로드 링크 생성 실패:", error);
      }

      let googleSheetsUpdated = false;
      let googleSheetsError: string | undefined;

      // Google Sheets 업데이트 시도
      const spreadsheetId = process.env.SPREADSHEET_ID;
      console.log("spreadsheetId:", spreadsheetId);
      if (spreadsheetId && results.length > 0) {
        try {
          functions.logger.info("Google Sheets 업데이트 시작", {
            spreadsheetId,
            resultsCount: results.length,
          });

          await this.googleSheetsService.updateGoogleSheetWithAutoCreate(results, year, month, spreadsheetId);

          googleSheetsUpdated = true;
          functions.logger.info("Google Sheets 업데이트 성공");
        } catch (error) {
          googleSheetsError = error instanceof Error ? error.message : "Unknown error";
          functions.logger.error("Google Sheets 업데이트 실패:", error);
        }
      } else if (!spreadsheetId) {
        functions.logger.warn("SPREADSHEET_ID 환경변수가 설정되지 않음");
        googleSheetsError = "SPREADSHEET_ID not configured";
      }

      const responseData: CalculationResponse = {
        results,
        zipDownloadLink,
        folderName,
        processedFiles: employeeDataMap.size,
        googleSheetsUpdated,
        googleSheetsError,
      };

      functions.logger.info("Calculation completed successfully", {
        folderName,
        processedFiles: employeeDataMap.size,
        resultsCount: results.length,
        googleSheetsUpdated,
      });

      response.json(responseData);
    } catch (error) {
      functions.logger.error("Calculation error:", error);
      response.status(500).json({
        error: "급여 계산 중 서버 에러가 발생했습니다.",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * 폴더 ZIP 다운로드 링크 생성 엔드포인트
   * @param {Request} request - Express 요청 객체
   * @param {Response} response - Express 응답 객체
   */
  async getFiles(request: Request, response: Response): Promise<void> {
    try {
      const sheetYear = request.query.sheetYear as string;
      const sheetMonth = request.query.sheetMonth as string;

      const validation = validateQueryParams(sheetYear, sheetMonth);
      if (!validation.isValid) {
        response.status(400).json({error: validation.error});
        return;
      }

      const {year, month} = validation as { year: number; month: number };
      const folderName = createFolderName(year, month);

      console.log(`폴더 ZIP 생성 요청: ${folderName}`);

      // 먼저 폴더에 파일이 있는지 확인
      const files = await this.storageService.getFiles(folderName);

      if (files.length === 0) {
        response.status(404).json({
          error: `${folderName} 폴더에서 파일을 찾을 수 없습니다.`,
        });
        return;
      }

      // 폴더를 ZIP으로 압축하고 다운로드 링크 생성
      const zipDownloadUrl = await this.storageService.createFolderZip(folderName);

      response.json({
        folderName,
        zipDownloadUrl,
        fileCount: files.length,
        message: `${folderName} 폴더의 ${files.length}개 파일이 ZIP으로 압축되었습니다.`,
      });
    } catch (error) {
      functions.logger.error("ZIP 생성 에러:", error);
      response.status(500).json({
        error: "ZIP 파일 생성 중 에러가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
