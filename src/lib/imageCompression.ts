/**
 * Client-side image compression utility for scholarship portal uploads.
 * 
 * Mobile phone cameras often produce 4MB - 12MB photos (3000x4000+ px).
 * Vercel Serverless Functions enforce a strict 4.5 MB request payload limit.
 * Compressing document images on the client downsizes them to ~150KB - 400KB
 * with crystal-clear document legibility, eliminating HTTP 413 errors,
 * mobile connection timeouts, and JSON parse crashes.
 */

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  maxSizeBytes?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxDimension: 1600, // 1600px gives crisp text legibility for A4 documents
  quality: 0.80,      // 80% JPEG quality
  maxSizeBytes: 400 * 1024, // Skip compression if already under 400KB
};

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // If not a browser environment or not an image, return original
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  const { maxDimension, quality, maxSizeBytes } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // If already sufficiently small, don't recompress
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // If dimensions are within limit and file isn't huge, compute scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Only use compressed version if it actually reduced file size
            if (blob.size < file.size) {
              const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
              const compressedFile = new File([blob], cleanName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.warn('Image compression fallback:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses an array of files concurrently (skipping PDFs/small files).
 */
export async function compressFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImageFile(f)));
}
