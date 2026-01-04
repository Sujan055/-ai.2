
import React, { useState, useEffect } from 'react';
import { AgentInfo, ThemeMode } from '../types';
import { THEME_CONFIGS } from '../constants';
import { Settings2, Power, ShieldCheck, Zap, Activity, Heart, Flame, Moon, Sparkles, Key, ExternalLink, RefreshCw } from 'lucide-react';

interface ControlPanelProps {
  agents: AgentInfo[];
  onToggleAgent: (agentId: string) => void;
  themeColor: string;
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  agents, 
  onToggleAgent, 
  themeColor, 
  isOpen, 
  onClose,
  currentTheme,
  onThemeChange
}) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        // @ts-ignore
        const status = await window.aistudio.hasSelectedApiKey();
        setHasKey(status);
      } catch (e) {
        setHasKey(false);
      }
    };
    if (isOpen) checkKey();
  }, [isOpen]);

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success as per instructions to avoid race conditions
      setHasKey(true);
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  if (!isOpen) return null;

  const personalities = [
    { mode: ThemeMode.AMARA, icon: <Heart size={18} />, label: 'Amara', desc: 'Sophisticated & Attentive' },
    { mode: ThemeMode.DEVOTION, icon: <Flame size={18} />, label: 'Devotion', desc: 'Warm & Nurturing' },
    { mode: ThemeMode.ECLIPSE, icon: <Moon size={18} />, label: 'Eclipse', desc: 'Precise & Efficient' }
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-end p-10 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-96 h-full bg-black/80 border border-white/10 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in slide-in-from-right duration-500">
        <div className="p-10 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Settings2 size={24} className="text-[var(--theme-color)]" />
            <h2 className="font-orbitron text-xl font-black text-white uppercase tracking-widest">System Config</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
            <Activity size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
          {/* Neural Access Key Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-orbitron text-white/30 uppercase tracking-[0.4em]">Neural Access Key</h3>
              <Key size={12} className={hasKey ? "text-emerald-400" : "text-amber-400"} />
            </div>
            
            <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-[10px] font-mono text-white/60 uppercase tracking-wider">
                    {hasKey === null ? 'Checking Status...' : hasKey ? 'Link Authenticated' : 'Key Required'}
                  </span>
                </div>
                <button 
                  onClick={handleSelectKey}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                >
                  <RefreshCw size={14} className={hasKey === null ? 'animate-spin' : ''} />
                </button>
              </div>

              <p className="text-[9px] text-white/30 font-mono leading-relaxed">
                Advanced synthesis protocols (Veo & Gemini 3 Pro) require a paid API key for low-latency, high-fidelity processing.
              </p>

              <div className="flex flex-col space-y-3 pt-2">
                <button 
                  onClick={handleSelectKey}
                  className="w-full py-3 bg-white/5 border border-white/10 hover:border-[var(--theme-color)]/50 rounded-2xl text-[10px] font-orbitron text-white uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
                >
                  <ShieldCheck size={14} className="text-[var(--theme-color)]" />
                  <span>Configure Access Key</span>
                </button>
                
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3 text-center text-[9px] font-mono text-white/20 hover:text-[var(--theme-color)] transition-colors flex items-center justify-center space-x-2"
                >
                  <ExternalLink size={12} />
                  <span>View Billing Documentation</span>
                </a>
              </div>
            </div>
          </div>

          {/* Personality Matrix Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-orbitron text-white/30 uppercase tracking-[0.4em]">Personality Matrix</h3>
              <Sparkles size={12} className="text-[var(--theme-color)]" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {personalities.map((p) => (
                <button
                  key={p.mode}
                  onClick={() => onThemeChange(p.mode)}
                  className={`relative p-5 rounded-3xl border transition-all duration-500 flex items-center space-x-4 text-left group overflow-hidden ${
                    currentTheme === p.mode 
                      ? 'bg-[var(--theme-color)]/10 border-[var(--theme-color)] shadow-[0_0_20px_var(--glow-color)]' 
                      : 'bg-white/5 border-white/5 hover:border-white/20'
                  }`}
                  style={{ '--theme-color': THEME_CONFIGS[p.mode].primary, '--glow-color': THEME_CONFIGS[p.mode].primary + '40' } as any}
                >
                  <div className={`p-3 rounded-2xl transition-all ${
                    currentTheme === p.mode ? 'bg-[var(--theme-color)] text-white' : 'bg-white/5 text-white/20 group-hover:text-white/40'
                  }`}>
                    {p.icon}
                  </div>
                  <div>
                    <p className={`text-xs font-orbitron uppercase tracking-widest font-black ${
                      currentTheme === p.mode ? 'text-[var(--theme-color)]' : 'text-white/60'
                    }`}>{p.label}</p>
                    <p className="text-[9px] text-white/30 font-mono mt-1">{p.desc}</p>
                  </div>
                  {currentTheme === p.mode && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--theme-color)] animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-orbitron text-white/30 uppercase tracking-[0.4em]">Sub-Agent Protocols</h3>
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between group transition-all hover:bg-white/10">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{agent.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-white uppercase font-orbitron tracking-wider">{agent.name}</p>
                      <p className="text-[9px] text-white/30 font-mono italic">{agent.status === 'working' ? 'CORE_ACTIVE' : 'READY_STANDBY'}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => onToggleAgent(agent.id)}
                    className={`w-12 h-7 rounded-full relative transition-all duration-500 border-2 ${
                      agent.status === 'working' 
                        ? 'bg-[var(--theme-color)]/20 border-[var(--theme-color)]' 
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-500 ${
                      agent.status === 'working' 
                        ? 'left-6 bg-[var(--theme-color)] shadow-[0_0_10px_var(--glow-color)]' 
                        : 'left-1 bg-white/20'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-10 border-t border-white/5 bg-white/5">
          <button 
            className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-orbitron text-[10px] tracking-[0.3em] uppercase hover:bg-red-500/20 transition-all flex items-center justify-center space-x-3"
            onClick={() => window.location.reload()}
          >
            <Zap size={14} />
            <span>Emergency Purge</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
