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

  // Upload to Vercel Blob
  const blob = await put(filename, buffer, {
    access: 'public',
    addRandomSuffix: false, // We're already using UUID
    contentType: mimeType,
  });

  return {
    filename,
    filePath: blob.url, // Store the blob URL in the DB instead of local path
    mimeType,
    size: buffer.length
  };
}

export async function getDocumentBuffer(filenameOrUrl: string) {
    // In local dev, it was filename. Now it's a URL. We can fetch it.
    // If it's a URL, we fetch it and return the buffer.
    const url = filenameOrUrl.startsWith('http') ? filenameOrUrl : filenameOrUrl; // Assume it's a URL now because Vercel Blob returns a URL
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch document');
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
