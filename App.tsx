
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Play, RotateCcw, Activity, Info, BrainCircuit, ChevronRight, Share2 } from 'lucide-react';
import { GravityType, GRAVITY_VALUES, PhysicsParams, TelemetryData } from './types';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import TelemetryDashboard from './components/TelemetryDashboard';
import AIAnalysis from './components/AIAnalysis';

const App: React.FC = () => {
  // State for parameters
  const [params, setParams] = useState<PhysicsParams>({
    theta: 45,
    v0: 20,
    h0: 0,
    gravity: GRAVITY_VALUES[GravityType.EARTH],
    mass: 1
  });

  const [gravityPreset, setGravityPreset] = useState<GravityType>(GravityType.EARTH);
  
  // Simulation State
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    t: 0, x: 0, y: 0, vx: 0, vy: 0, v: 0
  });
  
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const lastTimeRef = useRef<number>(0);

  // Calculation logic
  const calculateTelemetry = useCallback((t: number, p: PhysicsParams): TelemetryData => {
    const rad = (p.theta * Math.PI) / 180;
    const vx0 = p.v0 * Math.cos(rad);
    const vy0 = p.v0 * Math.sin(rad);

    const x = vx0 * t;
    const y = p.h0 + (vy0 * t) - (0.5 * p.gravity * Math.pow(t, 2));
    
    const vx = vx0;
    const vy = vy0 - (p.gravity * t);
    const v = Math.sqrt(vx * vx + vy * vy);

    return { t, x, y: Math.max(0, y), vx, vy, v };
  }, []);

  // Animation Loop
  useEffect(() => {
    let animationId: number;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = (time - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = time;

      if (isRunning) {
        setCurrentTime(prev => {
          const next = prev + deltaTime;
          const currentData = calculateTelemetry(next, params);
          
          setTelemetry(currentData);
          setHistory(h => [...h, currentData]);

          // Stop if hit ground
          if (next > 0 && currentData.y <= 0 && currentData.vy < 0) {
            setIsRunning(false);
            return prev;
          }
          
          return next;
        });
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isRunning, params, calculateTelemetry]);

  const handleReset = () => {
    setIsRunning(false);
    setCurrentTime(0);
    setHistory([]);
    setTelemetry({ t: 0, x: 0, y: 0, vx: 0, vy: 0, v: 0 });
    lastTimeRef.current = 0;
  };

  const handleToggle = () => {
    if (currentTime > 0 && !isRunning && telemetry.y <= 0) {
      handleReset();
    }
    setIsRunning(!isRunning);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ProjectilX</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Simulador de Movimiento Parabólico</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${
              isRunning 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20'
            }`}
          >
            {isRunning ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            {isRunning ? 'Pausar' : currentTime > 0 && telemetry.y <= 0 ? 'Reiniciar' : 'Lanzar'}
          </button>
          
          <button 
            onClick={handleReset}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Controls */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/30 overflow-y-auto">
          <ControlPanel 
            params={params} 
            setParams={setParams} 
            gravityPreset={gravityPreset}
            setGravityPreset={setGravityPreset}
            disabled={isRunning}
          />
        </aside>

        {/* Center: Canvas */}
        <section className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }} 
          />
          <SimulationCanvas 
            params={params} 
            telemetry={telemetry} 
            history={history} 
            isRunning={isRunning}
          />
          
          {/* Dashboard overlay */}
          <div className="absolute top-6 left-6 right-6 pointer-events-none">
             <TelemetryDashboard data={telemetry} />
          </div>

          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-3 rounded-xl pointer-events-auto">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Leyenda</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-slate-300 italic">Trayectoria actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                  <span className="text-xs text-slate-300 italic">Posición previa</span>
                </div>
              </div>
            </div>

            <AIAnalysis params={params} />
          </div>
        </section>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-8 bg-slate-900 border-t border-slate-800 flex items-center px-4 justify-between text-[10px] text-slate-500 font-mono">
        <div className="flex gap-4">
          <span>COORDINATES: ({telemetry.x.toFixed(2)}, {telemetry.y.toFixed(2)})</span>
          <span>SYSTEM_TIME: {currentTime.toFixed(3)}s</span>
        </div>
        <div className="flex gap-4">
          <span>GRAVITY: {params.gravity} m/s²</span>
          <span>RENDER: 60FPS</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
