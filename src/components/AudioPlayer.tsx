import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { 
  Download, 
  Music, 
  Play, 
  Pause, 
  RefreshCw, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Flame 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudioPlayerProps {
  url: string | null;
  isLoading: boolean;
  playTrigger?: number;
  onDownload: () => void;
}

export default function AudioPlayer({ url, isLoading, playTrigger, onDownload }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Custom generated heights for static/paused waveform bars (ensures beautiful design when paused)
  const [wavePreset] = useState(() => 
    Array.from({ length: 48 }, () => 0.15 + Math.random() * 0.7)
  );

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
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

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCurrentTime(value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  const handleSkipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
    }
  };

  const handleSkipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      audioRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!url && !isLoading) {
    return (
      <div id="audio-player-empty" className="glass-panel p-8 flex flex-col items-center justify-center text-center h-[340px]">
        <div className="w-16 h-16 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-6 border border-white/5 shadow-inner">
          <Music className="w-8 h-8 text-zinc-600 animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300">Your generated music will appear here</h3>
        <p className="text-sm text-zinc-500 mt-2 max-w-sm">Describe a vibe, upload a voice, and hit compose to synthesize your custom high-fidelity track.</p>
      </div>
    );
  }

  // Calculate percentage progress of the song
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div id="audio-player-studio" className="glass-panel p-8 relative overflow-hidden flex flex-col h-full bg-zinc-900/60 border border-white/10 shadow-2xl">
      {/* Waveform Background Vector */}
      <div className="absolute inset-x-0 bottom-0 top-12 flex items-end justify-between px-6 pb-2 pointer-events-none opacity-[0.06] select-none">
        {wavePreset.map((val, idx) => (
          <div
            key={idx}
            className={`w-1 bg-gradient-to-t from-orange-600 to-amber-400 rounded-full h-full transition-all duration-300 origin-bottom`}
            style={{
              transform: `scaleY(${isPlaying ? 0.15 + Math.random() * 0.8 : val})`,
              animationName: isPlaying ? 'bounceWave' : 'none',
              animationDuration: isPlaying ? `${0.6 + (idx % 5) * 0.15}s` : '0s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationDelay: `${idx * 25}ms`,
            }}
          />
        ))}
      </div>

      {/* Background radial glass haze glow */}
      <div className="absolute top-0 left-1 /2 -translate-x-1/2 w-72 h-72 bg-gradient-to-b from-orange-600/10 to-transparent blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex-grow flex flex-col justify-between h-full space-y-6">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="relative w-24 h-24 mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-orange-600/20 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-b-4 border-orange-500 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Composing your masterpiece...</h3>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-[0.2em] animate-pulse">Orchestrating custom tracks & synthesis</p>
          </div>
        ) : (
          <div className="w-full flex flex-col">
            {/* Upper console details */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Loaded into monitor</span>
              </div>
              <button
                type="button"
                onClick={onDownload}
                className="p-2 px-3.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/80 hover:text-white border border-white/5 text-zinc-300 transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save Audio (.wav)
              </button>
            </div>

            {/* Central console with interactive controls and circular disc */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-4">
              
              {/* Studio Spinning disc and waveforms */}
              <div className="relative flex items-center justify-center">
                <div className="relative w-28 h-28 rounded-full bg-zinc-950/90 border border-white/10 flex items-center justify-center p-2 shadow-2xl">
                  {/* Outer glowing frame */}
                  <div className={`absolute inset-0 rounded-full border border-orange-500/25 transition-all duration-1000 ${isPlaying ? 'animate-pulse scale-105' : ''}`} />
                  
                  {/* Grooved vinyl record */}
                  <motion.div
                    animate={isPlaying ? { rotate: 360 } : {}}
                    transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                    className="w-full h-full rounded-full bg-[radial-gradient(circle_at_center,_#27272a_0%,_#09090b_70%)] flex items-center justify-center relative shadow-inner"
                  >
                    {/* Ring grooves */}
                    <div className="absolute inset-4 rounded-full border border-zinc-850 opacity-40" />
                    <div className="absolute inset-8 rounded-full border border-zinc-850 opacity-40" />
                    {/* Core label */}
                    <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center border-2 border-zinc-900 shadow">
                      <Flame className="w-4 h-4 text-white font-black" />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Master Control Board */}
              <div className="flex-1 w-full space-y-4">
                {/* Media Playback Actions */}
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <button
                    type="button"
                    onClick={handleSkipBackward}
                    className="p-3.5 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-400 hover:text-white border border-white/5 hover:border-zinc-700 transition-all active:scale-95 cursor-pointer"
                    title="Skip backward 5s"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-lg hover:shadow-orange-950/40 transition-all active:scale-95 cursor-pointer"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-white text-white" /> : <Play className="w-5 h-5 fill-white text-white ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipForward}
                    className="p-3.5 rounded-2xl bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-400 hover:text-white border border-white/5 hover:border-zinc-700 transition-all active:scale-95 cursor-pointer"
                    title="Skip forward 5s"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  
                  {/* Volume Control widget */}
                  <div className="hidden sm:flex items-center gap-2 ml-4 bg-zinc-800/30 p-2 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="text-zinc-500 hover:text-orange-400 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 accent-orange-500 bg-zinc-800 rounded-lg appearance-none h-1 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Progress bar and timeline labels */}
                <div className="space-y-1.5">
                  <div className="relative">
                    {/* Visual filled track indicator glow */}
                    <div 
                      className="absolute left-0 top-0 h-1.5 rounded-lg bg-orange-600 pointer-events-none shadow-[0_0_8px_rgba(234,88,12,0.6)]" 
                      style={{ width: `${progressPercentage}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeekChange}
                      className="w-full accent-orange-600 bg-zinc-800 hover:bg-zinc-750/90 rounded-lg appearance-none h-1.5 cursor-pointer relative z-10 transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-zinc-400 font-bold">{formatTime(duration)}</span>
                  </div>
                </div>

              </div>
            </div>

            <audio
              ref={audioRef}
              src={url!}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onDurationChange={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
}

