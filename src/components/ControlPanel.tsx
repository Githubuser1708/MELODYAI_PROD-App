import React, { useState, useRef } from 'react';
import { Type, Music2, BrainCircuit, Sliders, ChevronDown, ChevronUp, RefreshCw, AudioWaveform, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GENRES, MOODS, INSTRUMENTS } from '../lib/constants';

interface ControlPanelProps {
  onGenerate: (params: any) => void;
  isLoading: boolean;
}

export default function ControlPanel({ onGenerate, isLoading }: ControlPanelProps) {
  const [params, setParams] = useState({
    prompt: '',
    lyrics: '',
    genre: GENRES[0],
    mood: MOODS[0],
    tempo: 120,
    instrumentation: [] as string[],
    duration: 'short' as 'short' | 'full',
  });

  const [referenceSong, setReferenceSong] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleInstrument = (inst: string) => {
    setParams(prev => ({
      ...prev,
      instrumentation: prev.instrumentation.includes(inst)
        ? prev.instrumentation.filter(i => i !== inst)
        : [...prev.instrumentation, inst]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isValidType = selectedFile.type.startsWith('audio/') || 
                         ['video/mp4', 'video/x-m4v', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/x-m4a'].includes(selectedFile.type) ||
                         /\.(mp3|wav|m4a|ogg|flac|aac|mp4)$/i.test(selectedFile.name);
                         
      if (!isValidType) {
        alert('Please upload a valid audio file (MP3, WAV, M4A, MP4, etc.)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setReferenceSong({
          data: base64.split(',')[1],
          mimeType: selectedFile.type,
          name: selectedFile.name
        });
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prompt Area */}
      <div className="space-y-2">
        <label className="label-title flex items-center gap-2">
          <BrainCircuit className="w-3 h-3 text-orange-500" /> Vibe & Prompt
        </label>
        <textarea
          value={params.prompt}
          onChange={(e) => setParams({ ...params, prompt: e.target.value })}
          placeholder="e.g. A lo-fi sunset track with upbeat drums and a dreamy pad melody..."
          className="input-primary w-full h-24 resize-none"
        />
      </div>

      {/* Reference Song Section */}
      <div className="space-y-2">
        <label className="label-title flex items-center gap-2">
          <AudioWaveform className="w-3 h-3 text-orange-500" /> Reference Style (Optional)
        </label>
        <div 
          onClick={() => !referenceSong && fileInputRef.current?.click()}
          className={`p-3 rounded-2xl border border-dashed transition-all cursor-pointer flex items-center justify-center gap-3
            ${referenceSong ? 'border-orange-500/50 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/50'}`}
        >
          {referenceSong ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-zinc-300 truncate">{referenceSong.name}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setReferenceSong(null); }}
                className="p-1 hover:text-red-400 text-zinc-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-500">Upload reference song</span>
            </>
          )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*,video/mp4,video/x-m4v,audio/mpeg,audio/wav,audio/aac,audio/ogg,audio/flac,.mp3,.wav,.m4a,.ogg,.flac,.aac,.mp4" className="hidden" />
      </div>

      {/* Grid for Pickers & Tempo */}
      <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label-title">Genre</label>
            <select
              value={params.genre}
              onChange={(e) => setParams({ ...params, genre: e.target.value })}
              className="input-primary w-full appearance-none cursor-pointer py-1.5 text-xs"
            >
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="label-title">Mood</label>
            <select
              value={params.mood}
              onChange={(e) => setParams({ ...params, mood: e.target.value })}
              className="input-primary w-full appearance-none cursor-pointer py-1.5 text-xs"
            >
              {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Instrumentation closely below */}
        <div className="space-y-2">
          <label className="label-title">Instrumentation</label>
          <div className="flex flex-wrap gap-1.5">
            {INSTRUMENTS.map(inst => (
              <button
                key={inst}
                onClick={() => toggleInstrument(inst)}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all
                  ${params.instrumentation.includes(inst)
                    ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                    : 'bg-zinc-800 text-zinc-500 border border-white/5 hover:border-zinc-700'
                  }`}
              >
                {inst}
              </button>
            ))}
          </div>
        </div>

        {/* Tempo slider same block */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="label-title !mb-0">Tempo</label>
            <span className="text-[10px] font-mono text-orange-500">{params.tempo} BPM</span>
          </div>
          <input
            type="range"
            min="60"
            max="200"
            value={params.tempo}
            onChange={(e) => setParams({ ...params, tempo: parseInt(e.target.value) })}
            className="w-full accent-orange-600 h-1 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Toggle Lyrics */}
      <div className="space-y-2">
        <button
          onClick={() => setShowLyrics(!showLyrics)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/50 transition-all text-xs font-medium text-zinc-400"
        >
          <div className="flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-zinc-500" /> Lyrics (Optional)
          </div>
          {showLyrics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        
        <AnimatePresence>
          {showLyrics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <textarea
                value={params.lyrics}
                onChange={(e) => setParams({ ...params, lyrics: e.target.value })}
                placeholder="Paste or write your lyrics here..."
                className="input-primary w-full h-24 mt-2 resize-none text-xs"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Duration & Generate */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-white/5">
          <button
            onClick={() => setParams({ ...params, duration: 'short' })}
            className={`py-1.5 px-3 rounded-lg text-[10px] font-semibold transition-all
              ${params.duration === 'short' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            30s Clip
          </button>
          <button
            onClick={() => setParams({ ...params, duration: 'full' })}
            className={`py-1.5 px-3 rounded-lg text-[10px] font-semibold transition-all
              ${params.duration === 'full' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Full Track
          </button>
        </div>

        <button
          onClick={() => onGenerate({ ...params, referenceSong })}
          disabled={isLoading || !params.prompt}
          className="btn-primary w-full group relative overflow-hidden py-3"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Music2 className="w-4 h-4 group-hover:animate-pulse" />
            )}
            {isLoading ? 'Generating Melody...' : 'Compose Song'}
          </span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </button>
      </div>
    </div>
  );
}
