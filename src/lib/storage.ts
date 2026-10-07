import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { siteConfig } from '@/config';

// Ensure this path is outside of public/
export const STORAGE_DIR = path.join(process.cwd(), 'storage', 'documents');

export async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

export async function saveDocument(buffer: Buffer, originalName: string, mimeType: string) {
  await ensureStorageDir();
  
  if (!siteConfig.allowedFileTypes.includes(mimeType)) {
    throw new Error('Invalid file type');
  }
  
  if (buffer.length > siteConfig.maxFileSize) {
    throw new Error('File size exceeds the limit');
  }

  // Create a safe, unique filename
  const ext = path.extname(originalName).toLowerCase();
  if (!siteConfig.allowedFileExtensions.includes(ext)) {
      throw new Error('Invalid file extension');
  }
  
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(STORAGE_DIR, filename);

  await fs.writeFile(filePath, buffer);

  return {
    filename,
    filePath,
    mimeType,
    size: buffer.length
  };
}

export async function getDocumentBuffer(filename: string) {
    const filePath = path.join(STORAGE_DIR, filename);
    return await fs.readFile(filePath);
}
