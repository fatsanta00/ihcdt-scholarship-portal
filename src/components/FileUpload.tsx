'use client';

import { useState, useRef } from 'react';
import { UploadCloud, X, File as FileIcon, AlertCircle } from 'lucide-react';
import { siteConfig } from '@/config';

interface FileUploadProps {
  id: string;
  title: string;
  required?: boolean;
  file: File | null;
  error?: string;
  onChange: (file: File | null) => void;
}

export default function FileUpload({ id, title, required, file, error, onChange }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFile = (newFile: File) => {
    if (!siteConfig.allowedFileTypes.includes(newFile.type) && !siteConfig.allowedFileExtensions.some(ext => newFile.name.toLowerCase().endsWith(ext))) {
      alert(`Invalid file type. Allowed formats: ${siteConfig.allowedFileExtensions.join(', ')}`);
      return;
    }
    if (newFile.size > siteConfig.maxFileSize) {
      alert(`File is too large. Maximum size is ${formatSize(siteConfig.maxFileSize)}.`);
      return;
    }
    onChange(newFile);
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
      handleFile(e.dataTransfer.files[0]);
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

      {!file ? (
        <div 
          className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${isDragging ? 'border-brand-green-500 bg-brand-green-50 scale-[1.02]' : 'border-slate-300 hover:border-brand-green-400 hover:bg-slate-50 hover:scale-[1.01]'}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isDragging && <div className="absolute inset-0 bg-brand-green-100 opacity-20 animate-pulse"></div>}
          <div className="relative z-10">
            <UploadCloud className={`w-12 h-12 mx-auto mb-4 transition-colors duration-300 ${isDragging ? 'text-brand-green-600' : 'text-slate-400'}`} />
            <p className="font-extrabold text-slate-700 text-lg mb-2">Click to upload or drag and drop</p>
            <p className="text-sm text-slate-500 font-medium">
              Accepted formats: {siteConfig.allowedFileExtensions.join(', ').toUpperCase()}<br/>
              Maximum size: <span className="font-bold">{formatSize(siteConfig.maxFileSize)}</span>
            </p>
          </div>
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={siteConfig.allowedFileExtensions.join(',')}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </div>
      ) : (
        <div className="bg-brand-green-50 border border-brand-green-200 rounded-2xl p-5 flex items-center justify-between transform transition-all animate-pop">
          <div className="flex items-center overflow-hidden">
            <div className="bg-white p-3 rounded-xl shadow-sm mr-4 shrink-0">
               <FileIcon className="w-8 h-8 text-brand-green-600" />
            </div>
            <div className="truncate">
              <p className="font-extrabold text-brand-green-900 text-lg truncate">{file.name}</p>
              <p className="text-sm font-bold text-brand-green-700">{formatSize(file.size)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 shrink-0 ml-4">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className="text-sm font-bold text-slate-600 hover:text-brand-green-800 bg-white px-4 py-2 rounded-xl border border-slate-200 hover:border-brand-green-300 shadow-sm transition-all"
            >
              Replace
            </button>
            <button 
              type="button" 
              onClick={() => onChange(null)} 
              className="p-2 text-slate-400 bg-white hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl shadow-sm transition-all"
              title="Remove File"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={siteConfig.allowedFileExtensions.join(',')}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </div>
      )}
      
      {error && (
        <div className="mt-3 text-sm text-red-600 flex items-center font-bold bg-red-50 p-3 rounded-xl animate-pop">
          <AlertCircle className="w-5 h-5 mr-2" /> {error}
        </div>
      )}
    </div>
  );
}
