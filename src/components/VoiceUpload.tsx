import React, { useState, useRef } from 'react';
import { Upload, Mic, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceUploadProps {
  onUpload: (data: string, mimeType: string) => void;
  onClear: () => void;
}

export default function VoiceUpload({ onUpload, onClear }: VoiceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    const isValidType = selectedFile.type.startsWith('audio/') || 
                       ['video/mp4', 'video/x-m4v', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/x-m4a'].includes(selectedFile.type) ||
                       /\.(mp3|wav|m4a|ogg|flac|aac|mp4)$/i.test(selectedFile.name);

    if (!isValidType) {
      alert('Please upload a valid audio file (MP3, WAV, M4A, MP4, etc.)');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(',')[1];
      onUpload(base64Data, selectedFile.type);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    onClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <label className="label-title">Personalized Voice Sample</label>
      
      <div
        className={`relative group h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden
          ${isDragging ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-800/40'}
          ${file ? 'border-orange-500/50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3 text-center px-6"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">Drop your voice sample here</p>
                <p className="text-xs text-zinc-500 mt-1">MP3, WAV, M4A, MP4 etc. (Max 10MB)</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 text-center px-6"
            >
              <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-400 truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-zinc-500 mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> Ready to clone
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="absolute top-3 right-3 p-2 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*,video/mp4,video/x-m4v,audio/mpeg,audio/wav,audio/aac,audio/ogg,audio/flac,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4"
        className="hidden"
      />
    </div>
  );
}
