
import React, { useState } from 'react';
import { Mic, Terminal, Zap, ShieldAlert, Cpu, Globe, PlayCircle, History, Sparkles, Trash2, Send } from 'lucide-react';

interface VoiceCommandHubProps {
  themeColor: string;
  isUserTalking: boolean;
  isSessionActive: boolean;
  onStartSession: () => void;
  onSelectSuggestion: (text: string) => void;
  lastCommand?: string;
  history?: string[];
  onClearHistory?: () => void;
}

const COMMAND_SUGGESTIONS = [
  { icon: <Zap size={12} />, text: "Switch theme to Amara", category: "System" },
  { icon: <ShieldAlert size={12} />, text: "Activate Vision module", category: "Security" },
  { icon: <Globe size={12} />, text: "Search for tech news", category: "Web" },
  { icon: <Cpu size={12} />, text: "Run system diagnostics", category: "Hardware" },
  { icon: <Terminal size={12} />, text: "Engage Devotion mode", category: "Emotional" }
];

const VoiceCommandHub: React.FC<VoiceCommandHubProps> = ({ 
  themeColor, 
  isUserTalking, 
  isSessionActive,
  onStartSession,
  onSelectSuggestion,
  lastCommand,
  history = [],
  onClearHistory
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'recent'>('suggestions');
  const [typedCommand, setTypedCommand] = useState('');

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (typedCommand.trim()) {
      onSelectSuggestion(typedCommand);
      setTypedCommand('');
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="bg-black/40 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-6 space-y-5 flex flex-col h-[420px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex space-x-4">
            <button 
              onClick={() => setActiveTab('suggestions')}
              className={`text-[10px] font-orbitron uppercase tracking-[0.2em] transition-all flex items-center ${activeTab === 'suggestions' ? 'text-[var(--theme-color)]' : 'text-white/20 hover:text-white/40'}`}
              style={{ '--theme-color': themeColor } as any}
            >
              <Terminal size={12} className="mr-2" /> Synaptic
            </button>
            <button 
              onClick={() => setActiveTab('recent')}
              className={`text-[10px] font-orbitron uppercase tracking-[0.2em] transition-all flex items-center ${activeTab === 'recent' ? 'text-[var(--theme-color)]' : 'text-white/20 hover:text-white/40'}`}
              style={{ '--theme-color': themeColor } as any}
            >
              <History size={12} className="mr-2" /> Recent
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            {!isSessionActive ? (
              <button 
                onClick={onStartSession}
                className="bg-[var(--theme-color)]/20 px-3 py-1 rounded-full border border-[var(--theme-color)]/40 text-[9px] font-orbitron text-[var(--theme-color)] uppercase tracking-wider hover:bg-[var(--theme-color)]/30 transition-all active:scale-95"
                style={{ '--theme-color': themeColor } as any}
              >
                <PlayCircle size={10} className="inline mr-1" />
                Link
              </button>
            ) : isUserTalking ? (
              <div className="flex items-center space-x-2 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-mono text-emerald-400 uppercase font-bold">Live</span>
              </div>
            ) : null}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
          {activeTab === 'suggestions' ? (
            COMMAND_SUGGESTIONS.map((cmd, idx) => (
              <button 
                key={idx} 
                onClick={() => onSelectSuggestion(cmd.text)}
                className="w-full group flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-[var(--theme-color)]/30 hover:bg-[var(--theme-color)]/5 transition-all text-left outline-none"
                style={{ '--theme-color': themeColor } as any}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-white/20 group-hover:text-[var(--theme-color)] transition-colors">
                    {cmd.icon}
                  </span>
                  <span className="text-[10px] font-quicksand text-white/50 group-hover:text-white/80 transition-colors italic">
                    "{cmd.text}"
                  </span>
                </div>
                <span className="text-[7px] font-orbitron text-white/10 uppercase tracking-widest">{cmd.category}</span>
              </button>
            ))
          ) : (
            <div className="space-y-2">
              {history.length > 0 ? (
                <>
                  {history.map((cmd, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => onSelectSuggestion(cmd)}
                      className="w-full group flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-[var(--theme-color)]/30 hover:bg-[var(--theme-color)]/5 transition-all text-left outline-none animate-in fade-in slide-in-from-left-2"
                      style={{ 
                        '--theme-color': themeColor,
                        animationDelay: `${idx * 50}ms`
                      } as any}
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <Sparkles size={10} className="text-white/10 group-hover:text-[var(--theme-color)] shrink-0" />
                        <span className="text-[10px] font-mono text-white/40 group-hover:text-white/80 truncate">
                          {cmd}
                        </span>
                      </div>
                      <span className="text-[7px] font-mono text-white/10 uppercase tracking-tighter shrink-0 ml-2">RE_SYNC</span>
                    </button>
                  ))}
                  <button 
                    onClick={onClearHistory}
                    className="w-full p-2 mt-4 text-[8px] font-orbitron text-white/10 hover:text-red-400 transition-colors uppercase tracking-[0.3em] flex items-center justify-center space-x-2"
                  >
                    <Trash2 size={10} />
                    <span>Purge Logs</span>
                  </button>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 space-y-4">
                  <History size={32} />
                  <p className="text-[9px] font-orbitron uppercase tracking-widest text-center">No cached<br/>interactions</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <form 
        onSubmit={handleTextSubmit}
        className="bg-black/60 border-l-4 border-[var(--theme-color)] backdrop-blur-2xl rounded-r-[2rem] p-4 flex items-center space-x-4 h-16 overflow-hidden transition-all group focus-within:bg-black/80 shadow-[0_0_15px_rgba(0,0,0,0.5)]" 
        style={{ borderColor: themeColor } as any}
      >
        <div className={`p-2 rounded-lg ${isUserTalking ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-white/20'} transition-all`}>
          <Mic size={16} className={isUserTalking ? 'animate-bounce' : ''} />
        </div>
        <div className="flex-1 flex flex-col">
          <p className="text-[8px] font-orbitron text-white/20 uppercase tracking-tighter mb-0.5">Intent_Engine</p>
          <input 
            type="text"
            value={typedCommand}
            onChange={(e) => setTypedCommand(e.target.value)}
            placeholder="Ask Nami anything..."
            className="bg-transparent border-none outline-none text-[11px] font-mono text-white/80 placeholder:text-white/20 italic w-full"
          />
        </div>
        {typedCommand.trim() && (
          <button 
            type="submit"
            className="p-2 text-[var(--theme-color)] hover:scale-110 transition-transform animate-in fade-in zoom-in"
            style={{ color: themeColor } as any}
          >
            <Send size={14} />
          </button>
        )}
      </form>
    </div>
  );
};

export default VoiceCommandHub;
