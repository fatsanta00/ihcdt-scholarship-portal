'use client';

import { useState, useRef } from 'react';
import { UploadCloud, X, File as FileIcon, AlertCircle } from 'lucide-react';
import { siteConfig } from '@/config';

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

export default function FileUpload({ id, title, required, files, error, multiple = false, maxFiles = 1, onChange }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFiles = (newFiles: FileList | File[]) => {
    let validFiles: File[] = [];
    const filesArray = Array.from(newFiles);
    
    for (const newFile of filesArray) {
      if (!siteConfig.allowedFileTypes.includes(newFile.type) && !siteConfig.allowedFileExtensions.some(ext => newFile.name.toLowerCase().endsWith(ext))) {
        alert(`Invalid file type for ${newFile.name}. Allowed formats: ${siteConfig.allowedFileExtensions.join(', ')}`);
        continue;
      }
      if (newFile.size > siteConfig.maxFileSize) {
        alert(`File ${newFile.name} is too large. Maximum size is ${formatSize(siteConfig.maxFileSize)}.`);
        continue;
      }
      validFiles.push(newFile);
    }

    if (multiple) {
      const combined = [...files, ...validFiles];
      if (combined.length > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files here.`);
        onChange(combined.slice(0, maxFiles));
      } else {
        onChange(combined);
      }
    } else {
      if (validFiles.length > 0) {
        onChange([validFiles[0]]);
      }
    }
  };

  const removeFile = (index: number) => {
    const newArray = [...files];
    newArray.splice(index, 1);
    onChange(newArray);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 mb-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-extrabold text-slate-800 text-xl flex items-center">
          {title} 
          {required && <span className="text-red-600 ml-3 text-xs uppercase tracking-wide font-bold bg-red-50 border border-red-100 px-3 py-1 rounded-full">Required</span>}
        </h4>
      </div>
      
      {multiple && maxFiles > 1 && (
        <p className="text-sm text-slate-500 mb-4 font-medium">You can upload up to {maxFiles} files.</p>
      )}

      {files.length > 0 && (
        <div className="space-y-3 mb-4">
          {files.map((file, idx) => (
            <div key={idx} className="bg-brand-green-50 border border-brand-green-200 rounded-2xl p-4 flex items-center justify-between transform transition-all animate-pop">
              <div className="flex items-center overflow-hidden">
                <div className="bg-white p-2 rounded-xl shadow-sm mr-3 shrink-0">
                  <FileIcon className="w-6 h-6 text-brand-green-600" />
                </div>
                <div className="truncate">
                  <p className="font-extrabold text-brand-green-900 text-base truncate">{file.name}</p>
                  <p className="text-xs font-bold text-brand-green-700">{formatSize(file.size)}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => removeFile(idx)} 
                className="p-2 ml-2 text-slate-400 bg-white hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl shadow-sm transition-all"
                title="Remove File"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(!files.length || (multiple && files.length < maxFiles)) && (
        <div 
          className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${isDragging ? 'border-brand-green-500 bg-brand-green-50 scale-[1.02]' : 'border-slate-300 hover:border-brand-green-400 hover:bg-slate-50 hover:scale-[1.01]'}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isDragging && <div className="absolute inset-0 bg-brand-green-100 opacity-20 animate-pulse"></div>}
          <div className="relative z-10">
            <UploadCloud className={`w-10 h-10 mx-auto mb-3 transition-colors duration-300 ${isDragging ? 'text-brand-green-600' : 'text-slate-400'}`} />
            <p className="font-extrabold text-slate-700 text-lg mb-1">{files.length > 0 ? 'Click to add more files or drag and drop' : 'Click to upload or drag and drop'}</p>
            <p className="text-xs text-slate-500 font-medium">
              Accepted formats: {siteConfig.allowedFileExtensions.join(', ').toUpperCase()}<br/>
              Maximum size: <span className="font-bold">{formatSize(siteConfig.maxFileSize)}</span>
            </p>
          </div>
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={siteConfig.allowedFileExtensions.join(',')}
            multiple={multiple}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processFiles(e.target.files);
              }
              // Reset input so the same file can be selected again if removed
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
        </div>
      )}
      
      {error && (
        <div className="mt-3 text-sm text-red-600 flex items-center font-bold bg-red-50 p-3 rounded-xl animate-pop">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
