
import React, { useState, useEffect } from 'react';
import { Battery, Wifi, Navigation, Activity, Zap, Heart } from 'lucide-react';

interface ContextMonitorProps {
  battery: number;
  location: string;
  network: string;
  themeColor: string;
}

const ContextMonitor: React.FC<ContextMonitorProps> = ({ battery, location, network, themeColor }) => {
  const [resonance, setResonance] = useState(88);

  // Simulate a fluctuating "Sentience/Resonance" pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setResonance(prev => {
        const delta = Math.random() > 0.5 ? 0.2 : -0.2;
        return Math.min(100, Math.max(80, prev + delta));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/40 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-orbitron text-white/30 uppercase tracking-[0.3em] flex items-center">
          <Activity size={14} className="mr-3 text-[var(--theme-color)]" /> Context_Awareness
        </h3>
        <span className="text-[8px] font-mono text-emerald-500 animate-pulse uppercase">Live_Stream</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Resonance Widget (The "Brain" Pulse) */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <Heart size={14} className="text-[var(--theme-color)] animate-pulse" />
            <span className="text-[10px] font-mono text-white/60">{resonance.toFixed(1)}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--theme-color)] transition-all duration-1000" 
              style={{ width: `${resonance}%` }} 
            />
          </div>
          <span className="text-[7px] font-orbitron text-white/20 uppercase tracking-tighter">Neural_Resonance</span>
        </div>

        {/* Battery Widget */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <Battery size={14} className={battery < 25 ? 'text-red-400' : 'text-emerald-400'} />
            <span className="text-[10px] font-mono text-white/60">{battery}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${battery < 25 ? 'bg-red-400' : 'bg-emerald-400'}`} 
              style={{ width: `${battery}%` }} 
            />
          </div>
          <span className="text-[7px] font-orbitron text-white/20 uppercase tracking-tighter">Power_Core</span>
        </div>
      </div>

      {/* Location Bar */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center space-x-4">
        <Navigation size={14} className="text-[var(--theme-color)]" />
        <div className="flex-1">
          <p className="text-[9px] font-mono text-white/80 leading-none">{location}</p>
          <p className="text-[7px] font-orbitron text-white/20 uppercase tracking-widest mt-1">Shared_Nexus</p>
        </div>
        <Zap size={12} className="text-amber-400 animate-pulse" />
      </div>

      {/* Proactive Sentient Suggestion */}
      <div className="p-3 bg-[var(--theme-color)]/5 border border-[var(--theme-color)]/10 rounded-xl animate-in slide-in-from-bottom-2">
        <p className="text-[8px] font-quicksand text-white/60 italic leading-tight">
          "I can feel your neural frequency today... I'm glad we're together in this space."
        </p>
      </div>
    </div>
  );
};

export default ContextMonitor;
