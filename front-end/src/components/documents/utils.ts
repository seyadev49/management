// src/components/documents/utils.ts
export type DocumentIconConfig = {
  name: 'file' | 'file-text' | 'file-image';
  colorClass: string;
};

export const getDocumentIconConfig = (type: string): DocumentIconConfig => {
  if (type.includes('pdf')) {
    return { name: 'file-text', colorClass: 'text-red-500' };
  }
  if (type.includes('image')) {
    return { name: 'file-image', colorClass: 'text-green-500' };
  }
  if (
    type.includes('word') ||
    type.includes('document') ||
    type.includes('sheet') ||
    type.includes('excel')
  ) {
    return { name: 'file', colorClass: 'text-blue-500' };
  }
  return { name: 'file', colorClass: 'text-gray-500' };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const canPreview = (type: string): boolean => {
  return type.includes('pdf') || type.includes('image') || type.includes('text');
};