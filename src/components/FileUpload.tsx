'use client';

import { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, File as FileIcon, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { siteConfig } from '@/config';
import { compressFiles } from '@/lib/imageCompression';
import { FileErrors, formatFileSize } from '@/lib/errorMessages';

interface FileUploadProps {
  id: string;
  title: string;
  required?: boolean;
  files: File[];
  error?: string;
  multiple?: boolean;
  maxFiles?: number;
  onChange: (files: File[]) => void;
}

interface FileError {
  filename: string;
  message: string;
}

export default function FileUpload({
  id,
  title,
  required,
  files,
  error,
  multiple = false,
  maxFiles = 1,
  onChange,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileErrors, setFileErrors] = useState<FileError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearFileErrors = useCallback(() => setFileErrors([]), []);

  /**
   * Validates and processes a batch of files from the user.
   * - Reports individual errors per file inline (no alert() dialogs)
   * - Auto-compresses images
   * - Falls back to original file if compression throws
   */
  const processFiles = useCallback(async (newFiles: FileList | File[]) => {
    const filesArray = Array.from(newFiles);
    const validFiles: File[] = [];
    const newErrors: FileError[] = [];

    for (const file of filesArray) {
      // 1. File type check (MIME + extension double-check)
      const typeOk = siteConfig.allowedFileTypes.includes(file.type);
      const extOk = siteConfig.allowedFileExtensions.some(ext =>
        file.name.toLowerCase().endsWith(ext)
      );
      if (!typeOk && !extOk) {
        newErrors.push({
          filename: file.name,
          message: FileErrors.typeMismatch(file.name, siteConfig.allowedFileExtensions),
        });
        continue;
      }

      // 2. Size check (before compression — post-compression checked implicitly)
      if (file.size > siteConfig.maxFileSize) {
        newErrors.push({
          filename: file.name,
          message: FileErrors.tooLarge(
            file.name,
            formatFileSize(file.size),
            formatFileSize(siteConfig.maxFileSize)
          ),
        });
        continue;
      }

      // 3. Zero-byte / unreadable file check
      if (file.size === 0) {
        newErrors.push({
          filename: file.name,
          message: FileErrors.corrupted(file.name),
        });
        continue;
      }

      validFiles.push(file);
    }

    // Report per-file errors immediately
    setFileErrors(newErrors);

    if (validFiles.length === 0) return;

    // 4. Too many files check
    const currentCount = multiple ? files.length : 0;
    const availableSlots = multiple ? maxFiles - currentCount : 1;
    if (validFiles.length > availableSlots) {
      setFileErrors(prev => [
        ...prev,
        {
          filename: '',
          message: FileErrors.tooManyFiles(maxFiles),
        },
      ]);
      validFiles.splice(availableSlots);
    }

    if (validFiles.length === 0) return;

    setIsProcessing(true);
    let optimizedFiles: File[] = validFiles;

    try {
      optimizedFiles = await compressFiles(validFiles);
    } catch (compressionErr) {
      // Log but don't block upload — use original files as fallback
      console.warn('[FileUpload] Image compression failed, using originals:', compressionErr);
      setFileErrors(prev => [
        ...prev,
        ...validFiles
          .filter(f => f.type.startsWith('image/'))
          .map(f => ({
            filename: f.name,
            message: FileErrors.compressionFailed(f.name),
          })),
      ]);
    } finally {
      setIsProcessing(false);
    }

    if (multiple) {
      onChange([...files, ...optimizedFiles].slice(0, maxFiles));
    } else {
      onChange([optimizedFiles[0]]);
    }
  }, [files, multiple, maxFiles, onChange]);

  const removeFile = useCallback((index: number) => {
    const updated = [...files];
    updated.splice(index, 1);
    onChange(updated);
    clearFileErrors();
  }, [files, onChange, clearFileErrors]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const showDropZone = !files.length || (multiple && files.length < maxFiles);

  return (
    <div
      className={`bg-white border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 shadow-sm transition-shadow hover:shadow-md ${
        error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3 sm:mb-4">
        <h4 className="font-extrabold text-slate-800 text-base sm:text-xl flex flex-wrap items-center gap-2">
          <span>{title}</span>
          {required && (
            <span className="text-red-600 text-[11px] sm:text-xs uppercase tracking-wide font-bold bg-red-50 border border-red-100 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shrink-0">
              Required
            </span>
          )}
          {files.length > 0 && !isProcessing && (
            <span className="text-brand-green-600 text-[11px] sm:text-xs uppercase tracking-wide font-bold bg-brand-green-50 border border-brand-green-100 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Uploaded
            </span>
          )}
        </h4>
      </div>

      {multiple && maxFiles > 1 && (
        <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4 font-medium">
          You can upload up to {maxFiles} files ({files.length}/{maxFiles} uploaded).
        </p>
      )}

      {/* Uploaded file list */}
      {files.length > 0 && (
        <div className="space-y-2.5 sm:space-y-3 mb-3 sm:mb-4">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="bg-brand-green-50 border border-brand-green-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between transform transition-all animate-pop"
            >
              <div className="flex items-center overflow-hidden min-w-0 pr-2">
                <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-sm mr-2.5 sm:mr-3 shrink-0">
                  <FileIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green-600" />
                </div>
                <div className="truncate min-w-0">
                  <p className="font-extrabold text-brand-green-900 text-sm sm:text-base truncate">{file.name}</p>
                  <p className="text-[11px] sm:text-xs font-bold text-brand-green-700">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="p-1.5 sm:p-2 ml-1 text-slate-400 bg-white hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg sm:rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
                title={`Remove ${file.name}`}
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {showDropZone && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Upload ${title}`}
          className={`relative overflow-hidden border-2 border-dashed rounded-xl sm:rounded-2xl p-5 sm:p-8 text-center transition-all duration-300 cursor-pointer ${
            isProcessing
              ? 'border-brand-green-400 bg-brand-green-50 cursor-wait'
              : isDragging
              ? 'border-brand-green-500 bg-brand-green-50 scale-[1.01]'
              : error
              ? 'border-red-400 hover:border-red-500 bg-red-50/30'
              : 'border-slate-300 hover:border-brand-green-400 hover:bg-slate-50'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !isProcessing && fileInputRef.current?.click(); } }}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-brand-green-100 opacity-20 animate-pulse" />
          )}
          <div className="relative z-10">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-2">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-brand-green-600 animate-spin mb-2" />
                <p className="font-extrabold text-brand-green-800 text-sm sm:text-base">
                  Optimising document for fast upload…
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Compressing high-resolution photo while preserving legibility
                </p>
              </div>
            ) : (
              <>
                <UploadCloud
                  className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 transition-colors duration-300 ${
                    isDragging ? 'text-brand-green-600' : error ? 'text-red-400' : 'text-slate-400'
                  }`}
                />
                <p className="font-extrabold text-slate-700 text-sm sm:text-lg mb-1 leading-snug">
                  {files.length > 0 ? 'Click to add more files or drag and drop' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Accepted formats:{' '}
                  <span className="font-bold">
                    {siteConfig.allowedFileExtensions.join(', ').toUpperCase()}
                  </span>
                  <br />
                  Maximum size:{' '}
                  <span className="font-bold">{formatFileSize(siteConfig.maxFileSize)}</span>
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            id={`file-input-${id}`}
            className="hidden"
            accept={siteConfig.allowedFileExtensions.join(',')}
            multiple={multiple}
            disabled={isProcessing}
            aria-describedby={error ? `file-error-${id}` : undefined}
            onChange={(e) => {
              if (e.target.files?.length) {
                processFiles(e.target.files);
              }
              // Reset so the same file can be re-selected after removal
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
        </div>
      )}

      {/* Per-file validation errors (inline, dismissible) */}
      {fileErrors.length > 0 && (
        <div className="mt-3 space-y-2">
          {fileErrors.map((fe, i) => (
            <div
              key={i}
              role="alert"
              className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 animate-pop"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span className="font-medium leading-snug">{fe.message}</span>
              <button
                type="button"
                onClick={() => setFileErrors(prev => prev.filter((_, idx) => idx !== i))}
                className="ml-auto p-0.5 text-red-400 hover:text-red-700 transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss this error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Required document error (from parent form validation) */}
      {error && (
        <div
          id={`file-error-${id}`}
          role="alert"
          className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl animate-pop"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}
    </div>
  );
}
