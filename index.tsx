
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Play, 
  RotateCcw, 
  Activity, 
  BrainCircuit, 
  Sparkles, 
  X, 
  Loader2, 
  SlidersHorizontal, 
  Target 
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- TYPES & CONSTANTS ---

enum GravityType {
  EARTH = 'Tierra (9.81)',
  MOON = 'Luna (1.62)',
  MARS = 'Marte (3.71)',
  SUN = 'Sol (274.0)',
  CUSTOM = 'Personalizada'
}

const GRAVITY_VALUES: Record<GravityType, number> = {
  [GravityType.EARTH]: 9.81,
  [GravityType.MOON]: 1.62,
  [GravityType.MARS]: 3.71,
  [GravityType.SUN]: 274.0,
  [GravityType.CUSTOM]: 9.81
};

interface PhysicsParams {
  theta: number;
  v0: number;
  h0: number;
  gravity: number;
  mass: number;
}

interface TelemetryData {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  v: number;
}

// --- SUB-COMPONENTS ---

const TelemetryDashboard: React.FC<{ data: TelemetryData }> = ({ data }) => {
  const Card = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center min-w-[100px] shadow-lg shadow-black/20">
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-mono font-bold text-blue-400">{value}</span>
        <span className="text-[10px] text-slate-500 font-mono">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      <Card label="Tiempo" value={data.t.toFixed(2)} unit="s" />
      <Card label="Distancia X" value={data.x.toFixed(1)} unit="m" />
      <Card label="Altura Y" value={data.y.toFixed(1)} unit="m" />
      <Card label="Vel. Total" value={data.v.toFixed(1)} unit="m/s" />
      <Card label="Velocidad X" value={data.vx.toFixed(1)} unit="m/s" />
      <Card label="Velocidad Y" value={data.vy.toFixed(1)} unit="m/s" />
    </div>
  );
};

const ControlPanel: React.FC<{
  params: PhysicsParams;
  setParams: (p: PhysicsParams) => void;
  gravityPreset: GravityType;
  setGravityPreset: (g: GravityType) => void;
  disabled: boolean;
}> = ({ params, setParams, gravityPreset, setGravityPreset, disabled }) => {
  const handleChange = (field: keyof PhysicsParams, value: number) => {
    setParams({ ...params, [field]: value });
  };

  const handleGravityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as GravityType;
    setGravityPreset(preset);
    if (preset !== GravityType.CUSTOM) {
      handleChange('gravity', GRAVITY_VALUES[preset]);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <SlidersHorizontal className="w-4 h-4 text-blue-500" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Configuración</h2>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 flex justify-between">
          <span>Entorno (Gravedad)</span>
          <span className="text-blue-400 font-mono">{params.gravity.toFixed(2)} m/s²</span>
        </label>
        <select 
          value={gravityPreset}
          onChange={handleGravityChange}
          disabled={disabled}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {Object.values(GravityType).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        {gravityPreset === GravityType.CUSTOM && (
          <input 
            type="range" min="0" max="300" step="0.01" value={params.gravity} disabled={disabled}
            onChange={(e) => handleChange('gravity', parseFloat(e.target.value))}
            className="w-full"
          />
        )}
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 flex justify-between">
          <span>Velocidad Inicial</span>
          <span className="text-blue-400 font-mono">{params.v0} m/s</span>
        </label>
        <input 
          type="range" min="1" max="200" value={params.v0} disabled={disabled}
          onChange={(e) => handleChange('v0', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 flex justify-between">
          <span>Ángulo de Lanzamiento</span>
          <span className="text-blue-400 font-mono">{params.theta}°</span>
        </label>
        <div className="relative pt-6 px-4">
            <div className="absolute top-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-700 rounded-bl-lg overflow-hidden pointer-events-none">
                <div 
                    className="absolute bottom-0 left-0 w-12 h-0.5 bg-blue-500 origin-bottom-left transition-transform" 
                    style={{ transform: `rotate(${-params.theta}deg)` }}
                />
            </div>
            <input 
                type="range" min="0" max="90" value={params.theta} disabled={disabled}
                onChange={(e) => handleChange('theta', parseInt(e.target.value))}
                className="w-full"
            />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 flex justify-between">
          <span>Altura Inicial (h₀)</span>
          <span className="text-blue-400 font-mono">{params.h0} m</span>
        </label>
        <input 
          type="range" min="0" max="100" value={params.h0} disabled={disabled}
          onChange={(e) => handleChange('h0', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-300 flex justify-between">
          <span>Masa del Objeto</span>
          <span className="text-blue-400 font-mono">{params.mass} kg</span>
        </label>
        <input 
          type="range" min="0.1" max="50" step="0.1" value={params.mass} disabled={disabled}
          onChange={(e) => handleChange('mass', parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="pt-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                <Target className="w-3 h-3" /> Info del Escenario
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed italic">
                Simulación ideal sin resistencia del aire en el entorno seleccionado.
            </p>
        </div>
      </div>
    </div>
  );
};

const SimulationCanvas: React.FC<{
  params: PhysicsParams;
  telemetry: TelemetryData;
  history: TelemetryData[];
}> = ({ params, telemetry, history }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    resize();
    window.addEventListener('resize', resize);

    const PADDING = 60;
    const GROUND_LEVEL = canvas.height - PADDING;
    
    const rad = (params.theta * Math.PI) / 180;
    const v0x = params.v0 * Math.cos(rad);
    const v0y = params.v0 * Math.sin(rad);
    const t_peak = v0y / params.gravity;
    const h_max = params.h0 + (v0y * t_peak) - (0.5 * params.gravity * Math.pow(t_peak, 2));
    const t_total = (v0y + Math.sqrt(v0y * v0y + 2 * params.gravity * params.h0)) / params.gravity;
    const x_max = v0x * t_total;

    const scaleX = (canvas.width - PADDING * 2) / Math.max(x_max * 1.2, 50);
    const scaleY = (canvas.height - PADDING * 2) / Math.max(h_max * 1.5, 30);
    const scale = Math.min(scaleX, scaleY);

    const toPX = (x: number) => PADDING + x * scale;
    const toPY = (y: number) => GROUND_LEVEL - y * scale;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PADDING, GROUND_LEVEL);
      ctx.lineTo(canvas.width - PADDING, GROUND_LEVEL);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(PADDING, GROUND_LEVEL);
      ctx.lineTo(PADDING, PADDING);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      for (let i = 0; i < 20; i++) {
          const val = i * 10;
          if (toPX(val) > canvas.width - PADDING) break;
          ctx.fillText(`${val}m`, toPX(val), GROUND_LEVEL + 20);
          ctx.fillText(`${val}m`, PADDING - 10, toPY(val));
      }

      if (history.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(toPX(history[0].x), toPY(history[0].y));
        for (let i = 1; i < history.length; i++) {
          ctx.lineTo(toPX(history[i].x), toPY(history[i].y));
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const size = Math.max(5, params.mass * 2); 
      ctx.fillStyle = '#f8fafc';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#3b82f6';
      ctx.beginPath();
      ctx.arc(toPX(telemetry.x), toPY(telemetry.y), size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (params.h0 > 0) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(PADDING - 10, toPY(params.h0), 20, GROUND_LEVEL - toPY(params.h0));
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(PADDING - 10, toPY(params.h0), 20, GROUND_LEVEL - toPY(params.h0));
      }

      requestAnimationFrame(draw);
    };

    const animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [telemetry, history, params]);

  return <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />;
};

const AIAnalysis: React.FC<{ params: PhysicsParams }> = ({ params }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const getAIAnalysis = async () => {
    setLoading(true);
    setIsOpen(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analiza los siguientes parámetros de un lanzamiento parabólico y explica el resultado físico esperado de forma concisa y educativa:
      - Ángulo: ${params.theta}°
      - Velocidad Inicial: ${params.v0} m/s
      - Altura Inicial: ${params.h0} m
      - Gravedad: ${params.gravity} m/s²
      - Masa: ${params.mass} kg (indica si afecta o no a la trayectoria en el vacío)`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAnalysis(response.text || "No se pudo generar el análisis.");
    } catch (error) {
      console.error(error);
      setAnalysis("Error conectando con el asistente de IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative pointer-events-auto">
      <button 
        onClick={getAIAnalysis}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-xl shadow-indigo-900/30 group"
      >
        <BrainCircuit className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        Analizar con IA
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Análisis Físico IA</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 max-h-[300px] overflow-y-auto text-sm text-slate-300">
            {loading ? <div className="flex flex-col items-center py-8 gap-3"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div> : analysis}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APPLICATION ---

const App: React.FC = () => {
  const [params, setParams] = useState<PhysicsParams>({
    theta: 45, v0: 20, h0: 0, gravity: GRAVITY_VALUES[GravityType.EARTH], mass: 1
  });
  const [gravityPreset, setGravityPreset] = useState<GravityType>(GravityType.EARTH);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [telemetry, setTelemetry] = useState<TelemetryData>({ t: 0, x: 0, y: 0, vx: 0, vy: 0, v: 0 });
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const lastTimeRef = useRef<number>(0);

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

  useEffect(() => {
    let animationId: number;
    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      if (isRunning) {
        setCurrentTime(prev => {
          const next = prev + deltaTime;
          const currentData = calculateTelemetry(next, params);
          setTelemetry(currentData);
          setHistory(h => [...h, currentData]);
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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600"><Activity className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ProjectilX</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Simulador Parabólico Consolidado</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsRunning(!isRunning)} className="flex items-center gap-2 px-6 py-2 rounded-full font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg">
            {isRunning ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            {isRunning ? 'Pausar' : 'Lanzar'}
          </button>
          <button onClick={handleReset} className="p-2 rounded-full text-slate-400 hover:bg-slate-800 transition-colors"><RotateCcw className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-slate-800 bg-slate-900/30 overflow-y-auto">
          <ControlPanel params={params} setParams={setParams} gravityPreset={gravityPreset} setGravityPreset={setGravityPreset} disabled={isRunning} />
        </aside>

        <section className="flex-1 relative bg-slate-950">
          <SimulationCanvas params={params} telemetry={telemetry} history={history} />
          <div className="absolute top-6 left-6 right-6 pointer-events-none"><TelemetryDashboard data={telemetry} /></div>
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-3 rounded-xl pointer-events-auto text-[10px] text-slate-500 uppercase font-bold">
              Leyenda: <span className="text-blue-500 ml-2">● Trayectoria</span> <span className="text-slate-300 ml-2">● Proyectil</span>
            </div>
            <AIAnalysis params={params} />
          </div>
        </section>
      </main>

      <footer className="h-8 bg-slate-900 border-t border-slate-800 flex items-center px-4 justify-between text-[10px] text-slate-500 font-mono">
        <div>COORDS: ({telemetry.x.toFixed(2)}, {telemetry.y.toFixed(2)}) • T: {currentTime.toFixed(3)}s</div>
        <div>G: {params.gravity} m/s² • 60FPS</div>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
