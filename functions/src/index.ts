/**
 * Firebase Functions 엔트리포인트
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {Request, Response} from "express";
import {CalculationController} from "./controllers/calculationController";

// Firebase Admin 초기화
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    functions.logger.info("Firebase Admin SDK initialized successfully");
  } catch (error) {
    functions.logger.error("Firebase Admin SDK initialization error:", error);
    // 기본 설정으로 재시도
    admin.initializeApp({
      projectId: process.env.GCLOUD_PROJECT || "acg-playground",
    });
    functions.logger.info("Firebase Admin SDK initialized with basic config");
  }
}

// 컨트롤러 인스턴스 생성
const calculationController = new CalculationController();

/**
 * 급여 계산 함수
 * 쿼리 파라미터: sheetYear, sheetMonth
 * 예시: /calculateSalary?sheetYear=2025&sheetMonth=3
 */
export const calculateSalary = functions.https.onRequest(
  async (request: Request, response: Response) => {
    await calculationController.calculate(request, response);
  }
);

/**
 * Storage 파일 목록 조회 함수
 * 쿼리 파라미터: sheetYear, sheetMonth
 * 예시: /getStorageFile?sheetYear=2025&sheetMonth=3
 */
export const getStorageFile = functions.https.onRequest(
  async (request: Request, response: Response) => {
    await calculationController.getFiles(request, response);
  }
);
