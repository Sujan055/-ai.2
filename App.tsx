
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, FunctionDeclaration, Type, Tool } from '@google/genai';
import { ThemeMode, AgentInfo, GeneratedMedia } from './types';
import { THEME_CONFIGS, SYSTEM_MODEL, AGENTS as INITIAL_AGENTS, IMAGE_GEN_MODEL, VIDEO_GEN_MODEL, IMAGE_EDIT_MODEL, PRO_MODEL } from './constants';
import { decode, decodeAudioData, createBlob, blobToBase64 } from './services/audioUtils';
import Hologram from './components/Hologram';
import AgentDashboard from './components/AgentDashboard';
import DiagnosticOverlay from './components/DiagnosticOverlay';
import ContextMonitor from './components/ContextMonitor';
import VoiceCommandHub from './components/VoiceCommandHub';
import RoutineManager, { Task as RoutineTask } from './components/RoutineManager';
import BrowserOverlay from './components/BrowserOverlay';
import AutomationHub from './components/AutomationHub';
import CreativeStudio from './components/CreativeStudio';
import ControlPanel from './components/ControlPanel';
import { 
  Heart, Settings, Mic, MicOff, Zap, ChevronDown, 
  Eye, EyeOff, RotateCcw, Sparkles, Activity, Send, 
  Terminal as TerminalIcon, Image as ImageIcon, Video as VideoIcon,
  CloudUpload, Loader2, Volume2, VolumeX, Waves
} from 'lucide-react';

const FRAME_RATE = 1; 
const JPEG_QUALITY = 0.6;

const switchThemeTool: FunctionDeclaration = {
  name: 'switch_theme',
  description: 'Switch the current UI theme and Nami personality mode. Available themes are: Amara, Devotion, and Eclipse.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      theme: {
        type: Type.STRING,
        description: 'The name of the theme to switch to: amara, devotion, or eclipse.',
        enum: ['amara', 'devotion', 'eclipse']
      }
    },
    required: ['theme']
  }
};

const tools: Tool[] = [
  { functionDeclarations: [switchThemeTool] }
];

const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(ThemeMode.AMARA);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string>('orch');
  const [systemLogs, setSystemLogs] = useState<string[]>(['Neural link standby.', 'Waiting for initialization.']);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  
  const [isMuted, setIsMuted] = useState(false);
  const [showCreativeStudio, setShowCreativeStudio] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);
  
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  // Creative State
  const [mediaGallery, setMediaGallery] = useState<GeneratedMedia[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  const [agents, setAgents] = useState<AgentInfo[]>(INITIAL_AGENTS);
  const [tasks, setTasks] = useState<RoutineTask[]>([
    { id: '1', text: 'Sync Nami neural buffers', completed: false, type: 'manual' },
    { id: '2', text: 'Auto-optimize creative cache', completed: true, type: 'automation' },
  ]);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentInputTranscriptionRef = useRef<string>('');

  const addLog = (msg: string) => {
    setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const addToHistory = (text: string) => {
    if (!text.trim()) return;
    setCommandHistory(prev => [text, ...prev.filter(c => c !== text)].slice(0, 10));
  };

  const ensureApiKey = async () => {
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      addLog("SECURITY: Paid API key required for high-fidelity synthesis.");
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
  };

  const handleStartSession = async () => {
    try {
      await ensureApiKey();
      addLog("Initializing Neural Link...");
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (!inputAudioContextRef.current) {
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: SYSTEM_MODEL,
        callbacks: {
          onopen: () => {
            setIsSessionActive(true);
            addLog("Neural link established.");
            
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
              
              const volume = inputData.reduce((acc, val) => acc + Math.abs(val), 0) / inputData.length;
              setIsUserTalking(volume > 0.01);
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const fullTranscription = currentInputTranscriptionRef.current.trim();
              if (fullTranscription) {
                addToHistory(fullTranscription);
                addLog(`USER_VOICE: ${fullTranscription}`);
              }
              currentInputTranscriptionRef.current = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputAudioContextRef.current!,
                24000,
                1
              );
              
              const source = outputAudioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current!.destination);
              source.onended = () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) setIsSpeaking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'switch_theme') {
                  const newThemeStr = (fc.args as any).theme;
                  let newTheme: ThemeMode = ThemeMode.AMARA;
                  if (newThemeStr === 'devotion') newTheme = ThemeMode.DEVOTION;
                  else if (newThemeStr === 'eclipse') newTheme = ThemeMode.ECLIPSE;
                  
                  setTheme(newTheme);
                  addLog(`SYSTEM: Theme switched to ${newThemeStr.toUpperCase()}`);
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } }
                    });
                  });
                }
              }
            }

            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => s.stop());
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            addLog(`ERROR: Neural link disrupted.`);
            setIsSessionActive(false);
          },
          onclose: () => {
            setIsSessionActive(false);
            addLog("Neural link closed.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: THEME_CONFIGS[theme].voice } }
          },
          systemInstruction: THEME_CONFIGS[theme].instructions,
          inputAudioTranscription: {},
          tools
        }
      });
      
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      addLog(`ERROR: Link failed - ${err}`);
    }
  };

  const handleGenerateImage = async (prompt: string, aspectRatio: string, size: string) => {
    try {
      setIsGenerating(true);
      setGenerationProgress("Nami is painting your vision...");
      await ensureApiKey();
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: IMAGE_GEN_MODEL,
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: size as any } },
      });

      const candidate = response.candidates?.[0];
      if (candidate) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const url = `data:image/png;base64,${part.inlineData.data}`;
            setMediaGallery(prev => [{ id: Date.now().toString(), type: 'image', url, prompt, timestamp: Date.now() }, ...prev]);
            addLog("CREATIVE: New image synthesized.");
          }
        }
      }
    } catch (err) {
      addLog(`ERROR: Synthesis failed - ${err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async (prompt: string, aspectRatio: string) => {
    try {
      setIsGenerating(true);
      setGenerationProgress("Veo engine warming up. This might take a moment...");
      await ensureApiKey();
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let operation = await ai.models.generateVideos({
        model: VIDEO_GEN_MODEL,
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: aspectRatio as any
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setMediaGallery(prev => [{ id: Date.now().toString(), type: 'video', url, prompt, timestamp: Date.now() }, ...prev]);
        addLog("CREATIVE: New video synthesized.");
      }
    } catch (err) {
      addLog(`ERROR: Video synthesis failed - ${err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeVideo = (file: File) => {
    addLog(`VISION: Analyzing ${file.name} is not implemented in this demo.`);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleToggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'working' ? 'ready' : 'working' } : a));
  };

  const handleSelectSuggestion = (text: string) => {
    setLastCommand(text);
    addToHistory(text);
    addLog(`USER_HUB: Executing command "${text}"`);
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    addLog(`SYSTEM: Personality matrix shifted to ${newTheme.toUpperCase()}. Re-syncing link...`);
    // If a session is active, we tell the user the persona will shift on next interaction or we could restart.
    // For simplicity, we'll suggest restarting the link to apply new instructions if it's open.
    if (isSessionActive) {
      addLog("SYSTEM: Neural Link requires re-calibration to apply new personality instructions.");
    }
  };

  const runDiagnostic = () => {
    setIsDiagnosticRunning(true);
    addLog("DIAGNOSTIC: Running full system scan...");
    setTimeout(() => {
      setIsDiagnosticRunning(false);
      addLog("DIAGNOSTIC: All systems optimal.");
    }, 5000);
  };

  return (
    <div className={`min-h-screen bg-black text-white font-quicksand selection:bg-[var(--theme-color)]/30 overflow-hidden flex flex-col`} style={{ '--theme-color': THEME_CONFIGS[theme].primary, '--glow-color': THEME_CONFIGS[theme].primary + '40' } as any}>
      <Hologram themeColor={THEME_CONFIGS[theme].primary} isSpeaking={isSpeaking} />
      
      {isDiagnosticRunning && <DiagnosticOverlay themeColor={THEME_CONFIGS[theme].primary} />}

      <header className="relative z-20 flex items-center justify-between p-8">
        <div className="flex items-center space-x-6">
          <div className="w-12 h-12 rounded-full bg-[var(--theme-color)]/20 border border-[var(--theme-color)] flex items-center justify-center shadow-[0_0_15px_var(--glow-color)]">
            <Heart size={24} className="text-[var(--theme-color)] fill-[var(--theme-color)] animate-pulse" />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-black tracking-widest uppercase">NAMI <span className="text-[var(--theme-color)]">OS</span></h1>
            <p className="text-[10px] font-mono text-white/40 tracking-[0.3em] uppercase">{THEME_CONFIGS[theme].systemName} Protocol Active</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center space-x-3">
            <Activity size={14} className="text-emerald-400" />
            <span className="text-[10px] font-mono text-white/60">LINK_SYNC: {isSessionActive ? 'CONNECTED' : 'STANDBY'}</span>
          </div>
          <button onClick={() => setShowControlPanel(true)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-white/60 hover:text-white">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 relative z-20 grid grid-cols-12 gap-8 p-8 overflow-hidden">
        <div className="col-span-3 flex flex-col space-y-8 overflow-hidden">
          <div className="flex-1">
            <RoutineManager tasks={tasks} onToggleTask={handleToggleTask} themeColor={THEME_CONFIGS[theme].primary} />
          </div>
          <VoiceCommandHub 
            themeColor={THEME_CONFIGS[theme].primary} 
            isUserTalking={isUserTalking}
            isSessionActive={isSessionActive}
            onStartSession={handleStartSession}
            onSelectSuggestion={handleSelectSuggestion}
            lastCommand={lastCommand}
            history={commandHistory}
            onClearHistory={() => setCommandHistory([])}
          />
        </div>

        <div className="col-span-6 flex flex-col items-center justify-center">
          {showCreativeStudio ? (
            <div className="relative w-full h-full flex items-center justify-center">
               <button onClick={() => setShowCreativeStudio(false)} className="absolute top-0 right-0 p-4 text-white/40 hover:text-white z-50">Close Studio</button>
               <CreativeStudio 
                 onGenerateImage={handleGenerateImage}
                 onGenerateVideo={handleGenerateVideo}
                 onAnalyzeVideo={handleAnalyzeVideo}
                 gallery={mediaGallery}
                 themeColor={THEME_CONFIGS[theme].primary}
               />
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-12">
               <div className="relative">
                 {isSpeaking && (
                   <div className="absolute inset-0 -m-8 border-4 border-[var(--theme-color)]/20 rounded-full animate-ping" />
                 )}
                 <div className={`w-64 h-64 rounded-full border-2 border-white/5 flex items-center justify-center bg-white/5 backdrop-blur-3xl shadow-[0_0_50px_var(--glow-color)] transition-all duration-500 ${isSpeaking ? 'scale-110 border-[var(--theme-color)]' : ''}`}>
                    <Waves size={80} className={`${isSpeaking ? 'text-[var(--theme-color)]' : 'text-white/20'} transition-colors duration-500`} />
                 </div>
               </div>
               
               <div className="flex flex-col items-center text-center space-y-4">
                 <h2 className="font-orbitron text-4xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_20px_var(--glow-color)]">
                   {isSpeaking ? 'TRANSMITTING' : isUserTalking ? 'LISTENING' : 'IDLE'}
                 </h2>
                 <p className="max-w-md text-white/40 font-quicksand text-lg">
                   {isSessionActive 
                    ? "Link is open. Speak naturally or use the command hub to interact." 
                    : "Establish neural link to begin interaction with Nami OS."}
                 </p>
               </div>

               <div className="flex items-center space-x-6">
                 {!isSessionActive ? (
                    <button onClick={handleStartSession} className="px-10 py-4 bg-[var(--theme-color)] text-white rounded-full font-orbitron text-[11px] tracking-[0.4em] uppercase hover:scale-105 transition-transform flex items-center space-x-3 shadow-[0_0_30px_var(--glow-color)]">
                      <Zap size={16} />
                      <span>Establish Link</span>
                    </button>
                 ) : (
                    <div className="flex items-center space-x-4">
                      <button onClick={() => setIsMuted(!isMuted)} className={`p-5 rounded-full border border-white/10 transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                      </button>
                      <button onClick={() => setShowCreativeStudio(true)} className="px-10 py-4 bg-white/5 border border-white/10 text-white rounded-full font-orbitron text-[11px] tracking-[0.4em] uppercase hover:bg-white/10 transition-all flex items-center space-x-3">
                        <Sparkles size={16} className="text-[var(--theme-color)]" />
                        <span>Creative Studio</span>
                      </button>
                    </div>
                 )}
               </div>
            </div>
          )}
        </div>

        <div className="col-span-3 flex flex-col space-y-8 overflow-hidden">
           <ContextMonitor battery={84} location="Sector 7" network="Mesh_v4" themeColor={THEME_CONFIGS[theme].primary} />
           
           <div className="flex-1 bg-black/40 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 flex flex-col space-y-6 overflow-hidden">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-orbitron text-white/30 uppercase tracking-[0.3em]">System_Logs</h3>
                <button onClick={runDiagnostic} className="text-[8px] font-orbitron text-[var(--theme-color)] hover:underline uppercase">Rescan</button>
             </div>
             <div className="flex-1 font-mono text-[9px] text-white/40 space-y-2 overflow-y-auto pr-2 scrollbar-hide">
                {systemLogs.map((log, i) => (
                  <div key={i} className="flex space-x-3">
                    <span className="text-white/10">{i === 0 ? '>' : ' '}</span>
                    <span className={i === 0 ? 'text-white' : ''}>{log}</span>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </main>

      <AgentDashboard agents={agents} theme={theme} activeAgentId={isSessionActive ? 'orch' : undefined} onAgentSelect={(id) => addLog(`AGENT: ${id} manual focus requested.`)} />

      <ControlPanel 
        isOpen={showControlPanel} 
        onClose={() => setShowControlPanel(false)} 
        agents={agents} 
        onToggleAgent={handleToggleAgent} 
        themeColor={THEME_CONFIGS[theme].primary} 
        currentTheme={theme}
        onThemeChange={handleThemeChange}
      />

      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center space-y-8">
           <div className="w-24 h-24 border-4 border-transparent border-t-[var(--theme-color)] rounded-full animate-spin" />
           <div className="text-center space-y-2">
              <h2 className="font-orbitron text-xl font-black text-white uppercase tracking-widest animate-pulse">Synthesis in Progress</h2>
              <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em]">{generationProgress}</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
