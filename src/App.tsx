import React, { useState, useEffect } from 'react';
import { 
  Music, 
  Waves, 
  Mic2, 
  Sparkles, 
  AlertCircle, 
  Key, 
  ExternalLink, 
  History, 
  LogIn, 
  UserPlus, 
  Chrome, 
  LogOut, 
  CheckCircle2, 
  Crown, 
  Lock, 
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ControlPanel from './components/ControlPanel';
import VoiceUpload from './components/VoiceUpload';
import AudioPlayer from './components/AudioPlayer';
import Archive, { ArchiveItem } from './components/Archive';
import { decodeAudioResponse, GenerationParams } from './lib/musicService';
import { saveAudio, getAudio, deleteAudio } from './lib/audioDb';

// Import Firebase Client Context
import { auth, db } from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User 
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

export default function App() {
  // Fireauth user context states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Paid Subscription status
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Studio modal states
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [modalType, setModalType] = useState<'auth' | 'checkout'>('auth');

  // App functionalities states
  const [voiceSample, setVoiceSample] = useState<{ data: string; mimeType: string } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playTrigger, setPlayTrigger] = useState(0);

  // Archive state
  const [archive, setArchive] = useState<ArchiveItem[]>(() => {
    const saved = localStorage.getItem('melodymix_archive');
    return saved ? JSON.parse(saved) : [];
  });

  // Listener for Firebase Authenticated User context
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (!currentUser) {
        setIsPaid(false);
      } else {
        // Automatically close auth modal since they have successfully logged in
        setShowStudioModal(false);
      }
    });
    return unsubscribe;
  }, []);

  // Realtime subscription status sync via safe Firestore Snapshots
  useEffect(() => {
    if (!user) return;

    // Open connection snapshot targeting /customers/{userId}
    const docRef = doc(db, 'customers', user.uid);
    const unsubscribeSnapshot = onSnapshot(docRef, (snapDoc) => {
      if (snapDoc.exists()) {
        const data = snapDoc.data();
        setIsPaid(data?.isPaidSubscriber === true);
      } else {
        // Fallback or double check against backend endpoint
        checkSubscriptionBackend(user);
      }
    }, (snapError) => {
      console.warn("Realtime firestore listener failed, pulling snapshot bypass:", snapError.message);
      checkSubscriptionBackend(user);
    });

    return unsubscribeSnapshot;
  }, [user]);

  const checkSubscriptionBackend = async (currentUser: User) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const status = await res.json();
        setIsPaid(status.isPaidSubscriber === true);
      } else {
        setIsPaid(false);
      }
    } catch (_) {
      setIsPaid(false);
    }
  };

  // Reconstruct active Blob URLs from IndexedDB to ensure play/download work across sessions
  useEffect(() => {
    const reconstructArchiveUrls = async () => {
      const saved = localStorage.getItem('melodymix_archive');
      if (!saved) return;
      try {
        const parsed: ArchiveItem[] = JSON.parse(saved);
        const updatedList = await Promise.all(
          parsed.map(async (item) => {
            const stored = await getAudio(item.id);
            if (stored && stored.base64) {
              const url = decodeAudioResponse(stored.base64, stored.mimeType);
              return { ...item, url };
            }
            return item;
          })
        );
        setArchive(updatedList);
      } catch (err) {
        console.error('Failed to reconstruct archive active links:', err);
      }
    };
    reconstructArchiveUrls();
  }, []);

  useEffect(() => {
    localStorage.setItem('melodymix_archive', JSON.stringify(archive));
  }, [archive]);

  // Auth processing actions
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password) {
      setAuthError('Please fill out all mandatory credentials.');
      return;
    }
    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error("Auth Failure:", err);
      setAuthError(err.message || 'Authentication sequence failed.');
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth failure:", err);
      setAuthError(err.message || 'Google Sign-In failed.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign-out failure:", err);
    }
  };

  // Secure checkout creation targeting designated stripe pricing
  const handleCheckoutLaunch = async () => {
    if (!user) return;
    setIsCheckoutLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uid: user.uid })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Server rejected checkout initialization.');
      }

      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No redirect URL received from payment processor.');
      }
    } catch (err: any) {
      console.error('Launch payment fail:', err);
      setError(err?.message || 'Failed to initialize paywall checkout.');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  // Secure Guarded Server-Side Melody Generation Stream Trigger
  const handleGenerate = async (params: any) => {
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const token = user ? await user.getIdToken() : null;
      const generationParams = {
        ...params,
        voiceSample: voiceSample || undefined
      };

      // Call our secure guarded server route
      const response = await fetch('/api/generate-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(generationParams)
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server returned error status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Guarded engine chunked body reader failed to initiate.');
      }

      const decoder = new TextDecoder();
      let audioBase64 = '';
      let generatedLyrics = '';
      let mimeType = 'audio/wav';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Backprop the trailing element
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            const parts = chunk.candidates?.[0]?.content?.parts;
            if (!parts) continue;

            for (const part of parts) {
              if (part.inlineData?.data) {
                if (!audioBase64 && part.inlineData.mimeType) {
                  mimeType = part.inlineData.mimeType;
                }
                audioBase64 += part.inlineData.data;
              }
              if (part.text && !generatedLyrics) {
                generatedLyrics = part.text;
              }
            }
          } catch (e) {
            console.warn("Chunk decode parsing skipped:", e);
          }
        }
      }

      if (audioBase64) {
        const url = decodeAudioResponse(audioBase64, mimeType);
        setAudioUrl(url);
        setPlayTrigger(prev => prev + 1);

        const newId = Date.now().toString();

        // Safe persist to browser IndexedDB
        await saveAudio(newId, audioBase64, mimeType).catch(err => {
          console.error("Failed to save audio to IndexedDB:", err);
        });

        // Save to archive list
        const newItem: ArchiveItem = {
          id: newId,
          url: url,
          prompt: params.prompt,
          genre: params.genre,
          mood: params.mood,
          timestamp: Date.now(),
        };
        setArchive(prev => [newItem, ...prev]);
      } else {
        throw new Error('Guarded compilation completed but returned zero bytes.');
      }
    } catch (err: any) {
      console.error('Server-side melody execution failed:', err);
      setError(err.message || 'Melody Generation stream failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteArchiveItem = async (id: string) => {
    setArchive(prev => prev.filter(item => item.id !== id));
    await deleteAudio(id).catch(err => {
      console.error("Failed to delete audio from IndexedDB:", err);
    });
  };

  const playArchiveItem = async (item: ArchiveItem) => {
    try {
      const stored = await getAudio(item.id);
      if (stored && stored.base64) {
        const url = decodeAudioResponse(stored.base64, stored.mimeType);
        setArchive(prev => prev.map(a => a.id === item.id ? { ...a, url } : a));
        setAudioUrl(url);
      } else {
        setAudioUrl(item.url);
      }
    } catch (err) {
      console.error("Failed to retrieve fresh audio from IndexedDB:", err);
      setAudioUrl(item.url);
    }
    setPlayTrigger(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadActiveTrack = () => {
    if (!user) {
      setError('Please sign in or register to download/save your generated tracks.');
      setModalType('auth');
      setShowStudioModal(true);
      return;
    }
    if (!isPaid) {
      setError('MelodyMix Studio Premium subscription is required to export/download audio tracks.');
      setModalType('checkout');
      setShowStudioModal(true);
      return;
    }
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = "melody-mix.wav";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadArchiveItem = (item: ArchiveItem) => {
    if (!user) {
      setError('Please sign in or register to download/save your generated tracks.');
      setModalType('auth');
      setShowStudioModal(true);
      return;
    }
    if (!isPaid) {
      setError('MelodyMix Studio Premium subscription is required to export/download audio tracks.');
      setModalType('checkout');
      setShowStudioModal(true);
      return;
    }
    const link = document.createElement('a');
    link.href = item.url;
    link.download = `melody-mix-${item.id}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-[0.2em]">Synchronizing Studio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-900/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <header className="relative z-20 pt-10 pb-6 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <div className="w-10 h-10 rounded-2xl bg-orange-600/15 border border-orange-500/25 flex items-center justify-center">
            <Music className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Melody<span className="text-orange-600">Mix</span> AI
            </h1>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-mono">Premium Music Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className="px-3 py-1">
                <p className="text-xs font-medium text-white max-w-[140px] truncate">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-400 font-mono uppercase">
                      <Crown className="w-3 h-3 fill-orange-400 text-orange-400" /> Premium Member
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-mono">Free Account</span>
                  )}
                </div>
              </div>

              {!isPaid && (
                <button
                  type="button"
                  onClick={() => {
                    setModalType('checkout');
                    setShowStudioModal(true);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-450 rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 fill-white/10" /> MelodyMix Studio
                </button>
              )}

              <button 
                onClick={handleSignOut}
                className="px-3 py-2 text-xs text-zinc-400 hover:text-white bg-zinc-800/45 hover:bg-zinc-800 rounded-xl transition duration-200 border border-white/5 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setModalType('auth');
                setShowStudioModal(true);
              }}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-450 rounded-xl shadow-lg transition-all active:scale-95 duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Access Music Studio
            </button>
          )}
        </div>
      </header>

      <main className="relative z-20 max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left compose controller inputs */}
          <div className="lg:col-span-4 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center gap-2 mb-6 text-white font-semibold">
                <Waves className="w-5 h-5 text-orange-500" />
                <h2>Compose Settings</h2>
              </div>
              <ControlPanel onGenerate={handleGenerate} isLoading={isLoading} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center gap-2 mb-6 text-white font-semibold">
                <Mic2 className="w-5 h-5 text-orange-500" />
                <h2>Voice Persona</h2>
              </div>
              <VoiceUpload 
                onUpload={(data, mimeType) => setVoiceSample({ data, mimeType })}
                onClear={() => setVoiceSample(null)}
              />
            </motion.div>
          </div>

          {/* Right results display panel */}
          <div className="lg:col-span-8 space-y-8 h-full">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="min-h-[300px]"
            >
              <AudioPlayer 
                url={audioUrl} 
                isLoading={isLoading} 
                playTrigger={playTrigger}
                onDownload={handleDownloadActiveTrack}
              />
            </motion.div>

            {/* Archive Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-panel p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-white font-semibold text-xl">
                  <History className="w-6 h-6 text-orange-500" />
                  <h2>Your Archive</h2>
                </div>
                <div className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full border border-white/5">
                  {archive.length} Saved Sessions
                </div>
              </div>
              <Archive 
                items={archive} 
                onPlay={playArchiveItem} 
                onDelete={deleteArchiveItem} 
                onDownload={handleDownloadArchiveItem}
              />
            </motion.div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Music, title: "High Fidelity", desc: "Studio-quality audio generation" },
                { icon: Mic2, title: "Voice Persona", desc: "Sing with your own voice sample" },
                { icon: Sparkles, title: "Smart Lyrics", desc: "AI-assisted lyric composition" }
              ].map((item, i) => (
                <div key={i} className="glass-panel p-6 border-white/5 bg-zinc-900/20">
                  <item.icon className="w-6 h-6 text-orange-500 mb-3" />
                  <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="relative z-20 py-12 border-t border-white/5 text-center">
        <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">
          MelodyMix AI &copy; 2026 • Crafted with Secure Cloud & Stripe
        </p>
      </footer>

      {/* Elegant Centered Modal Overlay for Studio & Auth */}
      <AnimatePresence>
        {showStudioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop filter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStudioModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="relative w-full max-w-md bg-zinc-900/95 border border-white/10 rounded-3xl shadow-2xl p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-850" />
              
              {/* Close Button element */}
              <button
                type="button"
                onClick={() => setShowStudioModal(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {modalType === 'auth' ? (
                <div>
                  <div className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
                      <Sparkles className="w-6 h-6 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Access Music Studio</h2>
                    <p className="text-zinc-500 text-sm mt-1">Sign in to compose, synthesize and stream</p>
                  </div>

                  <div className="flex border-b border-white/5 mb-6">
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className={`flex-1 py-2 text-sm font-medium border-b-2 transition duration-200 ${
                        authMode === 'signin' 
                          ? 'border-orange-500 text-white' 
                          : 'border-transparent text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2"><LogIn className="w-4 h-4" /> Sign In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className={`flex-1 py-2 text-sm font-medium border-b-2 transition duration-200 ${
                        authMode === 'signup' 
                          ? 'border-orange-500 text-white' 
                          : 'border-transparent text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> Register</span>
                    </button>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        required
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition duration-200"
                        placeholder="name@domain.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
                      <input
                        type="password"
                        value={password}
                        required
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 transition duration-200"
                        placeholder="••••••••••••"
                      />
                    </div>

                    {authError && (
                      <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm rounded-xl tracking-wide transition duration-200 flex items-center justify-center gap-2 cursor-pointer cursor-pointer"
                    >
                      {authMode === 'signin' ? 'Sign In Now' : 'Create Sandbox Account'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="relative my-6 text-center">
                    <hr className="border-white/5" />
                    <span className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-zinc-900 px-3 text-[10px] font-mono uppercase tracking-widest text-zinc-600">Or Connect</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    className="w-full py-3 bg-zinc-950 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-white/10 font-medium text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Chrome className="w-4 h-4 text-orange-500" /> Google Authentication
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-3xl bg-orange-600/15 border border-orange-500/20 flex items-center justify-center mx-auto mb-6">
                    <Crown className="w-10 h-10 text-orange-500 animate-pulse fill-orange-500/10" />
                  </div>

                  <h2 className="text-3xl font-bold text-white tracking-tight">MelodyMix Studio</h2>
                  <p className="text-zinc-400 text-sm mt-2 max-w-lg mx-auto">
                    Gain instant unrestricted server-side access to premium Lyria-3 models for composition, multi-tracks, vocals, and high fidelity outputs.
                  </p>

                  <div className="bg-zinc-950/60 p-5 rounded-2xl border border-white/5 flex items-center justify-between my-8 max-w-md mx-auto">
                    <div className="text-left">
                      <p className="text-xs text-zinc-500 uppercase font-mono">Membership Pass</p>
                      <p className="text-xl font-bold text-white mt-1">Premium Music</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-orange-500">$5<span className="text-xs text-zinc-500 font-normal">/month</span></p>
                    </div>
                  </div>

                  {error && (
                    <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 p-3 rounded-xl mb-6 flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isCheckoutLoading}
                    onClick={handleCheckoutLaunch}
                    className="px-8 py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 text-white font-semibold rounded-xl text-md transition duration-200 tracking-wide w-full max-w-md mx-auto shadow-lg shadow-orange-950/30 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    {isCheckoutLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Connecting Secure Checkout...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-orange-200" />
                        Upgrade to Premium
                      </>
                    )}
                  </button>
                  
                  <p className="text-[10px] text-zinc-600 font-mono mt-4 uppercase">Secure Payment via Stripe • Fully Encryption</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
