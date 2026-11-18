import '@testing-library/jest-dom';

// jsdom の Blob には text() / arrayBuffer() が無い(ブラウザにはある)。
// 読み込み(handleImport)や保存先ファイルの読み取り(projectSave)が使うので、テストでは FileReader で補う。
const readWith = <T extends string | ArrayBuffer>(read: (reader: FileReader) => void): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as T);
    reader.onerror = () => reject(reader.error);
    read(reader);
  });

if (!Blob.prototype.text) {
  Blob.prototype.text = function text(this: Blob) {
    return readWith<string>((reader) => reader.readAsText(this));
  };
}
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
    return readWith<ArrayBuffer>((reader) => reader.readAsArrayBuffer(this));
  };
}
