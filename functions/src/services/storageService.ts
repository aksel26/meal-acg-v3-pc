/**
 * Firebase Storage 서비스
 */

import * as admin from "firebase-admin";
import * as archiver from "archiver";
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

  /**
   * 폴더를 ZIP 파일로 압축하고 다운로드 링크 반환
   * @param {string} folderName - 폴더명
   * @param {number} expiresInHours - 만료 시간 (시간 단위)
   * @return {Promise<string>} ZIP 파일 다운로드 링크
   */
  async createFolderZip(folderName: string, expiresInHours = 24): Promise<string> {
    try {
      console.log(`폴더 ZIP 생성 시작: ${folderName}`);

      // 폴더 내 파일 목록 조회
      const files = await this.getFiles(folderName);

      if (files.length === 0) {
        throw new Error(`폴더 '${folderName}'에 파일이 없습니다.`);
      }

      console.log(`ZIP에 포함할 파일 수: ${files.length}`);

      // ZIP 파일명 생성 (타임스탬프 포함으로 중복 방지)
      const timestamp = Date.now();
      const zipFileName = `temp/${folderName.replace(/ /g, "_")}_${timestamp}.zip`;

      // ZIP 파일 생성을 위한 스트림 설정
      const zipFile = this.bucket.file(zipFileName);
      const zipStream = zipFile.createWriteStream({
        metadata: {
          contentType: "application/zip",
        },
      });

      // archiver 설정
      const archive = archiver.create("zip", {
        zlib: {level: 9}, // 최대 압축
      });

      // 에러 처리
      archive.on("error", (error: any) => {
        console.error("Archive error:", error);
        throw error;
      });

      // archive를 zipStream에 연결
      archive.pipe(zipStream);

      // 각 파일을 ZIP에 추가
      for (const file of files) {
        try {
          console.log(`파일 추가 중: ${file.name}`);

          // 파일 다운로드
          const fileBuffer = await this.downloadFile(file.name);

          // 파일명에서 폴더 경로 제거 (ZIP 내에서는 파일명만 사용)
          const fileName = file.name.split("/").pop() || file.name;

          // ZIP에 파일 추가
          archive.append(fileBuffer, {name: fileName});
        } catch (fileError) {
          console.warn(`파일 추가 실패: ${file.name}`, fileError);
          // 개별 파일 실패시에도 계속 진행
        }
      }

      // ZIP 생성 완료
      await new Promise<void>((resolve, reject) => {
        zipStream.on("error", reject);
        zipStream.on("finish", () => {
          console.log("ZIP 파일 업로드 완료");
          resolve();
        });

        archive.finalize();
      });

      console.log(`ZIP 파일 생성 완료: ${zipFileName}`);

      // ZIP 파일의 다운로드 링크 생성
      const zipDownloadUrl = await this.getSignedUrl(zipFileName, expiresInHours);

      // 임시 ZIP 파일은 24시간 후 자동 삭제되도록 설정 (선택사항)
      setTimeout(async () => {
        try {
          await this.bucket.file(zipFileName).delete();
          console.log(`임시 ZIP 파일 삭제: ${zipFileName}`);
        } catch (deleteError) {
          console.warn(`임시 ZIP 파일 삭제 실패: ${zipFileName}`, deleteError);
        }
      }, 24 * 60 * 60 * 1000); // 24시간

      return zipDownloadUrl;
    } catch (error) {
      console.error("ZIP 생성 중 에러:", error);
      throw new Error(`폴더 ZIP 생성 실패: ${error}`);
    }
  }
}
