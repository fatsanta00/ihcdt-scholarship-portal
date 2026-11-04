import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { siteConfig } from '@/config';
import path from 'path';
import fs from 'fs';

export async function saveDocument(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder?: string,
  docType?: string
) {
  if (!siteConfig.allowedFileTypes.includes(mimeType)) {
    throw new Error('Invalid file type');
  }
  
  if (buffer.length > siteConfig.maxFileSize) {
    throw new Error('File size exceeds the limit');
  }

  const ext = path.extname(originalName).toLowerCase();
  if (!siteConfig.allowedFileExtensions.includes(ext)) {
      throw new Error('Invalid file extension');
  }
  
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const docPrefix = docType ? docType.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) : '';
  const fileKey = `${docPrefix ? docPrefix + '_' : ''}${baseName}_${uuidv4().slice(0, 8)}${ext}`;
  const pathname = folder ? `${folder}/${fileKey}` : fileKey;

  // Local storage fallback for local development or isolated testing
  if (!process.env.BLOB_READ_WRITE_TOKEN || process.env.LOCAL_STORAGE === 'true') {
    const localStorageDir = path.resolve('.local_storage', folder || '');
    await fs.promises.mkdir(localStorageDir, { recursive: true });
    const fullPath = path.resolve('.local_storage', pathname);
    await fs.promises.writeFile(fullPath, buffer);

    return {
      filename: pathname,
      filePath: `file://${fullPath}`,
      mimeType,
      size: buffer.length
    };
  }

  // Upload to Vercel Blob (handling both private and public stores)
  let blob;
  try {
    blob = await put(pathname, buffer, {
      access: 'private',
      addRandomSuffix: false,
      contentType: mimeType,
    });
  } catch (err: any) {
    if (err?.message?.includes('public') || err?.message?.includes('private')) {
      blob = await put(pathname, buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: mimeType,
      });
    } else {
      throw err;
    }
  }

  return {
    filename: pathname,
    filePath: blob.url, // Store the blob URL in the DB instead of local path
    mimeType,
    size: buffer.length
  };
}

export async function getDocumentBuffer(filenameOrUrl: string) {
    if (filenameOrUrl.startsWith('file://')) {
      const localFilePath = filenameOrUrl.replace(/^file:\/\//, '');
      return await fs.promises.readFile(localFilePath);
    }

    const url = filenameOrUrl.startsWith('http') ? filenameOrUrl : filenameOrUrl;
    const headers: Record<string, string> = {};
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      headers['authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
