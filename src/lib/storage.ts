import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { siteConfig } from '@/config';
import path from 'path';

export async function saveDocument(buffer: Buffer, originalName: string, mimeType: string) {
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
  
  const filename = `${uuidv4()}${ext}`;

  // Upload to Vercel Blob (handling both private and public stores)
  let blob;
  try {
    blob = await put(filename, buffer, {
      access: 'private',
      addRandomSuffix: false, // We're already using UUID
      contentType: mimeType,
    });
  } catch (err: any) {
    if (err?.message?.includes('public') || err?.message?.includes('private')) {
      blob = await put(filename, buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: mimeType,
      });
    } else {
      throw err;
    }
  }

  return {
    filename,
    filePath: blob.url, // Store the blob URL in the DB instead of local path
    mimeType,
    size: buffer.length
  };
}

export async function getDocumentBuffer(filenameOrUrl: string) {
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
