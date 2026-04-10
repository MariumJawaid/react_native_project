import axios, { AxiosInstance } from 'axios';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';
import { logger } from './logger';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.100:5000/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

interface BatchAudioFile {
  uri: string;
  questionId: string;
  mimeType: 'audio/mpeg' | 'audio/wav' | 'audio/ogg' | 'audio/m4a';
}

interface BatchEvaluationResult {
  questionId: string;
  transcript: string;
  score: number;
  confidence: number;
}

interface BatchProcessingResponse {
  success: boolean;
  results: BatchEvaluationResult[];
  totalScore: number;
  batchId: string;
  timestamp: string;
}

/**
 * Batch Audio Processing Service
 * Handles multiple audio files for ADAS observational scoring
 * Implements retry logic and error handling
 */
export class BatchAudioProcessingService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BACKEND_URL,
      timeout: 300000, // 5 minute timeout for batch processing
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Process multiple ADAS audio files with retry logic
   * @param files Array of audio files to process
   * @param assessmentType ADAS assessment type
   * @returns Batch processing results
   */
  async processBatchADAS(
    files: BatchAudioFile[],
    assessmentType: 'observational' = 'observational'
  ): Promise<BatchProcessingResponse> {
    if (files.length === 0) {
      throw new Error('No audio files provided');
    }

    if (files.length > 12) {
      throw new Error('Maximum 12 audio files allowed per batch');
    }

    try {
      logger.info(`Starting batch processing of ${files.length} ADAS audio files`);

      // Validate all files
      for (const file of files) {
        await this.validateAudioFile(file);
      }

      // Convert files to base64
      const base64Files = await Promise.all(
        files.map(async (file) => ({
          ...file,
          base64Data: await this.fileToBase64(file.uri)
        }))
      );

      // Send batch request with retry
      const response = await this.retryRequest(
        () =>
          this.axiosInstance.post<BatchProcessingResponse>(
            '/assessment/batch-evaluate',
            {
              files: base64Files,
              assessmentType,
              totalFiles: files.length
            }
          ),
        MAX_RETRIES
      );

      logger.info(`Batch processing completed. Total score: ${response.data.totalScore}`);
      return response.data;
    } catch (error) {
      logger.error(`Batch processing error: ${error}`);
      throw this.handleError(error);
    }
  }

  /**
   * Validate audio file before processing
   */
  private async validateAudioFile(file: BatchAudioFile): Promise<void> {
    // Validate MIME type
    const validMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!validMimeTypes.includes(file.mimeType)) {
      throw new Error(`Invalid MIME type: ${file.mimeType}`);
    }

    // Check file exists using FileSystem
    try {
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      if (!fileInfo.exists) {
        throw new Error('File not found or inaccessible');
      }

      // Check file size (max 25MB) - handle both cases where size may or may not exist
      if (fileInfo.exists && 'size' in fileInfo && (fileInfo as any).size && (fileInfo as any).size > 26214400) {
        throw new Error('File size exceeds 25MB limit');
      }
    } catch (error) {
      throw new Error(`File validation failed for ${file.questionId}: ${error}`);
    }
  }

  /**
   * Convert file URI to base64 string
   */
  private async fileToBase64(uri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any
      });
      return base64;
    } catch (error) {
      throw new Error(`Failed to convert file to base64: ${error}`);
    }
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<any>,
    retries: number,
    delay: number = RETRY_DELAY
  ): Promise<any> {
    try {
      return await requestFn();
    } catch (error: any) {
      // Don't retry on validation errors
      if (error.response?.status === 400) {
        throw error;
      }

      if (retries === 0) {
        throw error;
      }

      logger.warn(`Request failed, retrying in ${delay}ms... (${retries} retries left)`);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff: double the delay each time
      return this.retryRequest(requestFn, retries - 1, delay * 2);
    }
  }

  /**
   * Handle various error types
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Backend returned error
      const status = error.response.status;
      const message = error.response.data?.error || 'Unknown error';

      switch (status) {
        case 400:
          return new Error(`Validation error: ${message}`);
        case 413:
          return new Error('File size too large (max 25MB)');
        case 500:
          return new Error('Server error. Please try again later.');
        default:
          return new Error(`Error (${status}): ${message}`);
      }
    } else if (error.request) {
      return new Error('No response from server. Check your connection.');
    } else {
      return new Error(error.message || 'Unknown error occurred');
    }
  }

  /**
   * Get batch processing status
   */
  async getBatchStatus(batchId: string): Promise<BatchProcessingResponse> {
    try {
      const response = await this.axiosInstance.get<BatchProcessingResponse>(
        `/assessment/batch-evaluate/${batchId}`
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to get batch status: ${error}`);
      throw this.handleError(error);
    }
  }

  /**
   * Cancel batch processing
   */
  async cancelBatch(batchId: string): Promise<void> {
    try {
      await this.axiosInstance.post(`/assessment/batch-evaluate/${batchId}/cancel`);
      logger.info(`Batch ${batchId} cancelled`);
    } catch (error) {
      logger.error(`Failed to cancel batch: ${error}`);
      throw this.handleError(error);
    }
  }
}

export const batchAudioProcessingService = new BatchAudioProcessingService();
