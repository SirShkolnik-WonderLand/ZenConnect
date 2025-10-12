'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/api';
import toast from 'react-hot-toast';

interface CSVUploadProps {
  onUploadComplete?: (result: any) => void;
  className?: string;
}

interface UploadResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
}

export default function CSVUpload({ onUploadComplete, className = '' }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await apiService.uploadFile(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success(`CSV uploaded successfully! Processing ${file.name}...`);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }

      // Reset after success
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
    },
    multiple: false,
    disabled: uploading,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive && !isDragReject 
            ? 'border-indigo-500 bg-indigo-50' 
            : isDragReject 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {uploading ? (
            <>
              <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">Processing CSV...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">{uploadProgress}% complete</p>
              </div>
            </>
          ) : (
            <>
              <div className={`
                p-3 rounded-full
                ${isDragActive && !isDragReject 
                  ? 'bg-indigo-100 text-indigo-600' 
                  : isDragReject 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {isDragReject ? (
                  <AlertCircle className="h-8 w-8" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive 
                    ? (isDragReject ? 'Invalid file type' : 'Drop your CSV file here')
                    : 'Upload Jane App CSV File'
                  }
                </p>
                <p className="text-sm text-gray-500">
                  Drag & drop your CSV file here, or click to select
                </p>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <FileText className="h-4 w-4" />
                <span>CSV files only • Max 10MB</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      {!uploading && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Expected CSV Format:
          </h4>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• <strong>Patient Name</strong> - Required</p>
            <p>• <strong>Patient Email</strong> - Optional</p>
            <p>• <strong>Patient Phone</strong> - Optional</p>
            <p>• <strong>Appointment Date</strong> - Required</p>
            <p>• <strong>Service Name</strong> - Required</p>
            <p>• <strong>Service Category</strong> - Optional</p>
            <p>• <strong>Provider Name</strong> - Required</p>
            <p>• <strong>Notes</strong> - Optional</p>
          </div>
        </div>
      )}
    </div>
  );
}


