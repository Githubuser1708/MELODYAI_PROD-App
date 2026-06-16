import React from 'react';
import { History, Play, Download, Trash2, Calendar, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ArchiveItem {
  id: string;
  url: string;
  prompt: string;
  genre: string;
  mood: string;
  timestamp: number;
}

interface ArchiveProps {
  items: ArchiveItem[];
  onPlay: (item: ArchiveItem) => void;
  onDelete: (id: string) => void;
  onDownload: (item: ArchiveItem) => void;
}

export default function Archive({ items, onPlay, onDelete, onDownload }: ArchiveProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
        <History className="w-12 h-12 mb-4" />
        <p className="text-sm">No saved sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto px-1 custom-scrollbar">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="group glass-panel p-4 flex flex-col gap-3 hover:bg-zinc-800/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-600/10 text-orange-400 border border-orange-500/20">
                    {item.genre}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/5">
                    {item.mood}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onPlay(item)}
                  className="p-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-lg active:scale-90"
                  title="Play session"
                >
                  <Play className="w-4 h-4 fill-white" />
                </button>
                <button
                  type="button"
                  onClick={() => onDownload(item)}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-all cursor-pointer"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-1 border-tl border-white/5 pt-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(item.timestamp).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Music className="w-3 h-3" />
                SAVED TRACK
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
