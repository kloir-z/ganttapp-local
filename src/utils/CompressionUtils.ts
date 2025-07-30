/**
 * スナップショットデータの圧縮・展開ユーティリティ
 * CompressionStream API (gzip) + Base64 を使用
 */

export interface CompressedData {
  compressed: string; // Base64エンコードされた圧縮データ
  originalSize: number; // 元のサイズ（バイト）
  compressedSize: number; // 圧縮後のサイズ（バイト）
  version: string; // 圧縮バージョン
}

const COMPRESSION_VERSION = '1.0';

/**
 * 文字列をgzip圧縮してBase64エンコード
 */
export async function compressData(data: string): Promise<CompressedData> {
  try {
    // 文字列をUint8Arrayに変換
    const encoder = new TextEncoder();
    const inputData = encoder.encode(data);
    const originalSize = inputData.length;

    // CompressionStream APIが利用可能かチェック
    if (!('CompressionStream' in window)) {
      throw new Error('CompressionStream API is not supported');
    }

    // gzip圧縮
    const compressionStream = new CompressionStream('gzip');
    const writer = compressionStream.writable.getWriter();
    const reader = compressionStream.readable.getReader();

    // データを書き込み
    writer.write(inputData);
    writer.close();

    // 圧縮データを読み取り
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // チャンクを結合
    const compressedData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      compressedData.set(chunk, offset);
      offset += chunk.length;
    }

    // Base64エンコード
    const base64 = btoa(String.fromCharCode(...compressedData));

    return {
      compressed: base64,
      originalSize,
      compressedSize: compressedData.length,
      version: COMPRESSION_VERSION
    };
  } catch (error) {
    console.error('Compression failed:', error);
    // フォールバック: 非圧縮データを返す
    return {
      compressed: data,
      originalSize: new Blob([data]).size,
      compressedSize: new Blob([data]).size,
      version: 'uncompressed'
    };
  }
}

/**
 * Base64デコードしてgzip展開
 */
export async function decompressData(compressedData: CompressedData): Promise<string> {
  try {
    // 非圧縮データの場合はそのまま返す
    if (compressedData.version === 'uncompressed') {
      return compressedData.compressed;
    }

    // DecompressionStream APIが利用可能かチェック
    if (!('DecompressionStream' in window)) {
      throw new Error('DecompressionStream API is not supported');
    }

    // Base64デコード
    const binaryString = atob(compressedData.compressed);
    const compressedBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      compressedBytes[i] = binaryString.charCodeAt(i);
    }

    // gzip展開
    const decompressionStream = new DecompressionStream('gzip');
    const writer = decompressionStream.writable.getWriter();
    const reader = decompressionStream.readable.getReader();

    // データを書き込み
    writer.write(compressedBytes);
    writer.close();

    // 展開データを読み取り
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // チャンクを結合して文字列に変換
    const decompressedData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      decompressedData.set(chunk, offset);
      offset += chunk.length;
    }

    // Uint8Arrayを文字列に変換
    const decoder = new TextDecoder();
    return decoder.decode(decompressedData);
  } catch (error) {
    console.error('Decompression failed:', error);
    // フォールバック: 圧縮データをそのまま返す（エラー回避）
    return compressedData.compressed;
  }
}

/**
 * 圧縮率を計算
 */
export function getCompressionRatio(compressedData: CompressedData): number {
  if (compressedData.originalSize === 0) return 0;
  return ((compressedData.originalSize - compressedData.compressedSize) / compressedData.originalSize) * 100;
}

/**
 * 圧縮データかどうかを判定
 */
export function isCompressedData(data: any): data is CompressedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.compressed === 'string' &&
    typeof data.originalSize === 'number' &&
    typeof data.compressedSize === 'number' &&
    typeof data.version === 'string'
  );
}

/**
 * 旧形式（文字列）から新形式（CompressedData）への変換
 */
export function migrateToCompressedFormat(oldData: string): CompressedData {
  return {
    compressed: oldData,
    originalSize: new Blob([oldData]).size,
    compressedSize: new Blob([oldData]).size,
    version: 'uncompressed'
  };
}