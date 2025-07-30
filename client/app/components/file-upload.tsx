'use client';

import * as React from 'react';
import { 
  Upload, 
  File, 
  CheckCircle, 
  AlertCircle, 
  X, 
  FileText,
  Loader2,
  Cloud
} from 'lucide-react';

interface UploadedFile {
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const FileUploadComponent: React.FC = () => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file: File) => {
    // const fileId = Date.now().toString();
    const newFile: UploadedFile = {
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
    };

    setUploadedFiles(prev => [...prev, newFile]);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.name === file.name && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);

      const response = await fetch('http://localhost:8000/upload/pdf', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (response.ok) {
        setUploadedFiles(prev =>
          prev.map(f =>
            f.name === file.name
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        );
        console.log('File uploaded successfully');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.name === file.name
            ? { 
                ...f, 
                status: 'error', 
                progress: 0,
                error: 'Upload failed. Please try again.'
              }
            : f
        )
      );
      console.error('Upload error:', error);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type === 'application/pdf') {
        uploadFile(file);
      } else {
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          size: file.size,
          status: 'error',
          progress: 0,
          error: 'Only PDF files are allowed'
        }]);
      }
    });
  };

  const handleFileUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const retryUpload = (fileName: string) => {
    const file = uploadedFiles.find(f => f.name === fileName);
    if (file) {
      // In a real app, you'd need to store the original File object
      // For now, we'll just remove the failed upload
      removeFile(fileName);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Main Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 scale-105' 
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileUploadButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        <div className="flex flex-col items-center space-y-4">
          <div className={`
            p-4 rounded-full transition-all duration-300
            ${isDragOver 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }
          `}>
            {isDragOver ? (
              <Cloud className="w-8 h-8" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {isDragOver ? 'Drop your PDF here' : 'Upload PDF Document'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Drag & drop your PDF files here, or click to browse
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
              <FileText className="w-4 h-4" />
              <span>PDF files only • Max 10MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress & File List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Uploaded Files ({uploadedFiles.length})
          </h4>
          
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`
                    p-2 rounded-full flex-shrink-0
                    ${file.status === 'success' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                      : file.status === 'error'
                      ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    }
                  `}>
                    {file.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {file.status === 'success' && <CheckCircle className="w-4 h-4" />}
                    {file.status === 'error' && <AlertCircle className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatFileSize(file.size)}</span>
                      {file.status === 'success' && (
                        <span className="text-green-600 dark:text-green-400">• Uploaded successfully</span>
                      )}
                      {file.status === 'error' && file.error && (
                        <span className="text-red-600 dark:text-red-400">• {file.error}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {file.status === 'error' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        retryUpload(file.name);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.name);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {file.status === 'uploading' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Uploading...</span>
                    <span>{file.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Success Message */}
      {uploadedFiles.some(f => f.status === 'success') && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Your PDF has been processed successfully! You can now start chatting about its content.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;