/**
 * Firebase Storage 서비스
 */

import * as admin from "firebase-admin";
import {StorageFileInfo} from "../types";
import {isExcelFile} from "../utils/validationUtils";

/**
 * Firebase Storage 서비스 클래스
 */
export class StorageService {
  private bucket: ReturnType<admin.storage.Storage["bucket"]>;

  /**
   * 스토리지 서비스 생성자
   */
  constructor() {
    this.bucket = admin.storage().bucket();
  }

  /**
   * 지정된 폴더에서 파일 목록 조회
   * @param {string} folderName - 폴더명
   * @return {Promise<StorageFileInfo[]>} 파일 정보 배열
   */
  async getFiles(folderName: string): Promise<StorageFileInfo[]> {
    const [files] = await this.bucket.getFiles({
      prefix: `${folderName}/`,
      delimiter: "/",
    });

    return files.map((file: any) => ({
      name: file.name,
      size: file.metadata?.size,
      contentType: file.metadata?.contentType,
      timeCreated: file.metadata?.timeCreated,
      updated: file.metadata?.updated,
    }));
  }

  /**
   * 지정된 폴더에서 Excel 파일만 필터링하여 조회
   * @param {string} folderName - 폴더명
   * @return {Promise<StorageFileInfo[]>} Excel 파일 정보 배열
   */
  async getExcelFiles(folderName: string): Promise<StorageFileInfo[]> {
    const files = await this.getFiles(folderName);
    return files.filter((file) => isExcelFile(file.name));
  }

  /**
   * 파일을 다운로드하여 Buffer로 반환
   * @param {string} fileName - 파일명 (전체 경로 포함)
   * @return {Promise<Buffer>} 파일 버퍼
   */
  async downloadFile(fileName: string): Promise<Buffer> {
    const file = this.bucket.file(fileName);
    const [buffer] = await file.download();
    return buffer;
  }

  /**
   * 파일이 존재하는지 확인
   * @param {string} fileName - 파일명 (전체 경로 포함)
   * @return {Promise<boolean>} 파일 존재 여부
   */
  async fileExists(fileName: string): Promise<boolean> {
    const file = this.bucket.file(fileName);
    const [exists] = await file.exists();
    return exists;
  }

  /**
   * 파일의 다운로드 URL 생성 (공개 읽기 권한 필요)
   * @param {string} fileName - 파일명 (전체 경로 포함)
   * @return {string} 다운로드 URL
   */
  getPublicUrl(fileName: string): string {
    return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
  }

  /**
   * Signed URL 생성 (임시 접근 링크)
   * 서비스 계정이 설정되지 않은 경우 Public URL 반환
   * @param {string} fileName - 파일명 (전체 경로 포함)
   * @param {number} expiresInHours - 만료 시간 (시간 단위, 기본 24시간)
   * @return {Promise<string>} Signed URL 또는 Public URL
   */
  async getSignedUrl(fileName: string, expiresInHours = 24): Promise<string> {
    try {
      const file = this.bucket.file(fileName);
      const expirationTime = Date.now() + expiresInHours * 60 * 60 * 1000;

      console.log("file:", file);
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: expirationTime,
      });
      console.log("url:", url);

      return url;
    } catch (error) {
      // Signed URL 생성 실패시 Public URL로 대체
      console.warn(`Signed URL 생성 실패, Public URL 사용: ${fileName}`, error);
      return this.getPublicUrl(fileName);
    }
  }

  /**
   * 폴더 내 모든 파일의 다운로드 링크 생성
   * @param {string} folderName - 폴더명
   * @param {number} expiresInHours - 만료 시간 (시간 단위)
   * @return {Promise<string[]>} 다운로드 링크 배열
   */
  async getAllFileDownloadLinks(folderName: string, expiresInHours = 24): Promise<string[]> {
    const files = await this.getFiles(folderName);
    const links: string[] = [];

    for (const file of files) {
      try {
        const url = await this.getSignedUrl(file.name, expiresInHours);
        links.push(url);
      } catch (error) {
        console.error(`Failed to get download URL for ${file.name}:`, error);
        // 실패해도 Public URL로 대체 시도
        try {
          const publicUrl = this.getPublicUrl(file.name);
          links.push(publicUrl);
        } catch (fallbackError) {
          console.error(`Failed to get public URL for ${file.name}:`, fallbackError);
        }
      }
    }

    return links;
  }
}
