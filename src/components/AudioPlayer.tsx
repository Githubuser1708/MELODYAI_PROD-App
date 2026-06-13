import { Download, Music, Play, Pause, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  url: string | null;
  isLoading: boolean;
  lyrics?: string;
  playTrigger?: number;
}

export default function AudioPlayer({ url, isLoading, lyrics, playTrigger }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error("Playback failed:", error);
            setIsPlaying(false);
          });
        }
      }
    }
  };

  useEffect(() => {
    setIsPlaying(false);
  }, [url]);

  useLayoutEffect(() => {
    if (playTrigger && playTrigger > 0 && audioRef.current && url) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error("Auto-playback failed in useLayoutEffect:", error);
            setIsPlaying(false);
          });
      }
    }
  }, [playTrigger]);

  if (!url && !isLoading) {
    return (
      <div className="glass-panel p-8 flex flex-col items-center justify-center text-center h-[300px]">
        <div className="w-16 h-16 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-6">
          <Music className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-400">Your generated music will appear here</h3>
        <p className="text-sm text-zinc-600 mt-2 max-w-sm">Describe a vibe, upload a voice, and hit generate to create something unique.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-8 relative overflow-hidden flex flex-col h-full">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-600/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-orange-600/20 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t-4 border-orange-600 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Composing your track...</h3>
            <p className="text-sm text-zinc-400 animate-pulse">Orchestrating AI magic</p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-700 shadow-xl shadow-orange-950/20 flex items-center justify-center mb-8 relative group">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
              >
                {isPlaying ? <Pause className="fill-white" /> : <Play className="fill-white ml-1" />}
              </motion.button>
              
              {/* Pulsing rings when playing */}
              {isPlaying && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-orange-400 rounded-[2rem]"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute inset-0 border-2 border-orange-400 rounded-[2rem]"
                  />
                </>
              )}
            </div>

            <audio
              ref={audioRef}
              src={url!}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            
            <div className="flex items-center gap-4 mb-8">
              <a
                href={url!}
                download="melody-mix.wav"
                className="p-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" /> Save Track
              </a>
            </div>

            {lyrics && (
              <div className="w-full mt-4">
                <label className="label-title">Generated Lyrics</label>
                <div className="max-h-40 overflow-y-auto p-4 rounded-2xl bg-zinc-950/50 border border-white/5 text-sm text-zinc-400 leading-relaxed custom-scrollbar">
                  {lyrics}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
