import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { 
  Keyboard, 
  Battery, 
  Camera, 
  Compass, 
  Navigation,
  CheckCircle,
  Play,
  RotateCcw,
  Gamepad2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const FlightSimulator: React.FC = () => {
  const { selectedProject, uploadFile } = useStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Flight Stats state
  const [altitude, setAltitude] = useState(15.2);
  const [battery, setBattery] = useState(94);
  const [photoCount, setPhotoCount] = useState(0);
  const [isHoveredOverDefect, setIsHoveredOverDefect] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Position of drone on Canvas
  const dronePos = useRef({ x: 250, y: 350 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Asset parameters (Wind turbine layout)
  const turbineCenter = { x: 250, y: 200 };
  const bladeAngle = useRef(0);
  
  // Defect spots on turbine
  const defectSpot1 = { x: 250, y: 120 }; // on vertical blade
  const defectSpot2 = { x: 380, y: 280 }; // base tower

  useEffect(() => {
    if (!gameStarted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        snapPhoto();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Main Game Loop
    const update = () => {
      // 1. Move Drone
      const speed = 2.5;
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
        dronePos.current.y = Math.max(20, dronePos.current.y - speed);
      }
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
        dronePos.current.y = Math.min(canvas.height - 20, dronePos.current.y + speed);
      }
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
        dronePos.current.x = Math.max(20, dronePos.current.x - speed);
      }
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
        dronePos.current.x = Math.min(canvas.width - 20, dronePos.current.x + speed);
      }

      // Rotate Turbine Blades slowly
      bladeAngle.current += 0.005;

      // 2. Check overlap with defects to trigger HUD warning
      const dx = dronePos.current.x - turbineCenter.x;
      const dy = dronePos.current.y - turbineCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Let's check proximity to blade center (turbine hub) or blade tips
      const isNearBladeTip = Math.abs(dronePos.current.x - 250) < 30 && Math.abs(dronePos.current.y - 120) < 30;
      setIsHoveredOverDefect(isNearBladeTip);

      // Emulate telemetry variance
      setAltitude(15 + (Math.sin(Date.now() / 1000) * 0.4));
      setBattery(prev => Math.max(10, prev - 0.005));

      // 3. Render Graphics
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid lines (flight area)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw Wind Turbine tower base
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(240, canvas.height);
      ctx.lineTo(248, 200);
      ctx.lineTo(252, 200);
      ctx.lineTo(260, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Draw blades rotating around hub
      ctx.save();
      ctx.translate(turbineCenter.x, turbineCenter.y);
      ctx.rotate(bladeAngle.current);
      
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      
      // 3 Blades at 120 degrees apart
      for (let i = 0; i < 3; i++) {
        ctx.rotate((120 * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -90);
        ctx.stroke();

        // Draw a simulated structural red crack line on blade 1 tips
        if (i === 0) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, -70);
          ctx.lineTo(-4, -75);
          ctx.lineTo(2, -80);
          ctx.stroke();
          ctx.strokeStyle = '#e2e8f0'; // restore
          ctx.lineWidth = 6;
        }
      }
      ctx.restore();

      // Draw hub circle
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(turbineCenter.x, turbineCenter.y, 10, 0, 2 * Math.PI);
      ctx.fill();

      // Highlight defect zone on blade tip in HUD overlay if drone is far
      if (!isNearBladeTip) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(250, 120, 20, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Draw Drone (Camera Gimbal)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(dronePos.current.x, dronePos.current.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Camera ring crosshair
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dronePos.current.x, dronePos.current.y, 18, 0, 2 * Math.PI);
      ctx.stroke();

      // crosshair tick marks
      ctx.beginPath();
      ctx.moveTo(dronePos.current.x - 22, dronePos.current.y);
      ctx.lineTo(dronePos.current.x - 14, dronePos.current.y);
      ctx.moveTo(dronePos.current.x + 14, dronePos.current.y);
      ctx.lineTo(dronePos.current.x + 22, dronePos.current.y);
      ctx.moveTo(dronePos.current.x, dronePos.current.y - 22);
      ctx.lineTo(dronePos.current.x, dronePos.current.y - 14);
      ctx.moveTo(dronePos.current.x, dronePos.current.y + 14);
      ctx.lineTo(dronePos.current.x, dronePos.current.y + 22);
      ctx.stroke();

      animationId = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
    };
  }, [gameStarted]);

  // Snap photo logic
  const snapPhoto = async () => {
    if (!selectedProject) return;

    // Trigger audio snap
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.setValueAtTime(800, audioContext.currentTime);
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    osc.start();
    osc.stop(audioContext.currentTime + 0.15);

    setPhotoCount(prev => prev + 1);

    // Create a mock file blob matching whether we hovered over turbine crack
    const isOverCrack = isHoveredOverDefect;
    const name = isOverCrack ? 'turbine_blade_crack.png' : 'turbine_normal_base.png';
    const text = isOverCrack ? 'MOCK_WIND_BLADE_CRACK_DATA' : 'MOCK_WIND_NORMAL_DATA';
    
    const blob = new Blob([text], { type: 'image/png' });
    const file = new File([blob], name, { type: 'image/png' });

    // Upload to store
    await uploadFile(selectedProject.id, file, '/');

    // Confetti success flash
    confetti({ particleCount: 30, spread: 40 });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] p-6 space-x-6 select-none">
      
      {/* Left side game simulator viewport */}
      <div className="flex-1 flex flex-col space-y-4">
        <div>
          <h2 className="text-xl font-bold text-brand-text">Autonomous Inspection Simulator</h2>
          <p className="text-xs text-brand-muted mt-0.5">Control the drone, inspect assets, and snap photos for live AI classification.</p>
        </div>

        {gameStarted ? (
          <div className="relative rounded-xl border border-brand-border overflow-hidden bg-slate-950 flex items-center justify-center">
            
            {/* Game Canvas */}
            <canvas 
              ref={canvasRef} 
              width={500} 
              height={450} 
              className="block bg-slate-950/80 shadow-2xl max-w-full"
            />

            {/* Flight HUD Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400">
              <div className="space-y-1 bg-slate-950/80 border border-brand-border/60 p-2 rounded backdrop-blur-md">
                <p className="flex items-center"><Navigation className="w-3.5 h-3.5 mr-1" /> Alt: {altitude.toFixed(1)} m</p>
                <p>Speed: 4.2 m/s</p>
                <p>Yaw: 212°</p>
              </div>

              <div className="space-y-1 bg-slate-950/80 border border-brand-border/60 p-2 rounded backdrop-blur-md text-right">
                <p className="flex items-center justify-end"><Battery className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Battery: {battery.toFixed(0)}%</p>
                <p className="text-emerald-400">GPS Lock: RTK-OK</p>
                <p>Signal: 98%</p>
              </div>
            </div>

            {/* Defect warning indicator */}
            {isHoveredOverDefect && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500 p-2 rounded text-[10px] text-red-400 font-bold uppercase tracking-wider animate-pulse pointer-events-none backdrop-blur-md">
                Defect Target Acquired - Space to Snap Photo
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 rounded-xl border border-brand-border/60 bg-slate-950/60 flex flex-col justify-center items-center p-8 text-center space-y-4">
            <Gamepad2 className="w-16 h-16 text-cyan-500 animate-pulse" />
            <h3 className="text-base font-bold text-brand-text">Launch Drone Flight Mission</h3>
            <p className="text-xs text-brand-muted max-w-xs">
              This simulator emulates drone operations. Fly over the wind turbine, position the crosshair over the red defect, and capture photos.
            </p>
            <button
              onClick={() => setGameStarted(true)}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg flex items-center space-x-2 text-xs shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Connect Drone RC</span>
            </button>
          </div>
        )}
      </div>

      {/* Right side telemetry status & project control */}
      <div className="w-80 border-l border-brand-border/60 flex flex-col h-full bg-brand-bg/20 p-6 space-y-5">
        <div>
          <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Flight Briefing</h4>
          <p className="text-[10px] text-brand-muted mt-0.5">Asset flight configuration settings</p>
        </div>

        {/* Selected boundary */}
        <div className="space-y-1.5 text-xs">
          <span className="text-brand-muted uppercase text-[9px] font-bold block">Inspection Boundary</span>
          {selectedProject ? (
            <div className="p-3 bg-slate-900/35 border border-brand-border/60 rounded-xl">
              <h5 className="font-semibold text-brand-text truncate">{selectedProject.name}</h5>
              <p className="text-[10px] text-brand-muted truncate mt-0.5">{selectedProject.company_name}</p>
            </div>
          ) : (
            <p className="text-brand-muted italic text-[10px] leading-relaxed">
              ⚠️ No boundary selected. Go to Projects and select a project first to link photo capture.
            </p>
          )}
        </div>

        {/* Controls Instructions */}
        <div className="glass-card p-4 rounded-xl border border-brand-border/60 space-y-3 text-xs">
          <h5 className="font-bold text-brand-text uppercase text-[10px] flex items-center">
            <Keyboard className="w-4 h-4 text-cyan-400 mr-1.5" /> Drone RC Commands
          </h5>
          <ul className="space-y-2 text-[10px] text-brand-muted">
            <li className="flex justify-between"><span>Forward / Reverse</span> <strong className="text-brand-text font-bold">W / S</strong></li>
            <li className="flex justify-between"><span>Translate Left / Right</span> <strong className="text-brand-text font-bold">A / D</strong></li>
            <li className="flex justify-between"><span>Trigger Camera Gimbal</span> <strong className="text-cyan-400 font-bold">SPACEBAR</strong></li>
          </ul>
        </div>

        {/* Captured list */}
        <div className="flex-1 min-h-0 flex flex-col space-y-2.5">
          <h5 className="font-bold text-brand-text uppercase text-[10px]">Captured Drone Photos ({photoCount})</h5>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {photoCount === 0 ? (
              <div className="text-center text-[10px] text-brand-muted py-6 border border-brand-border/40 border-dashed rounded-lg">
                No captures logged yet. Click SPACEBAR to snap image.
              </div>
            ) : (
              Array.from({ length: photoCount }).map((_, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 bg-slate-900/25 border border-brand-border/40 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Camera className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="truncate text-[10px] text-brand-text font-semibold">IMG_00{idx + 1}.png</span>
                  </div>
                  <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">Scanning</span>
                </div>
              ))
            )}
          </div>
        </div>

        {gameStarted && (
          <button
            onClick={() => {
              setGameStarted(false);
              setPhotoCount(0);
              setBattery(94);
            }}
            className="w-full py-2 bg-slate-900 border border-brand-border rounded-lg text-xs font-semibold text-brand-text flex items-center justify-center space-x-1.5 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Power Down Drone</span>
          </button>
        )}
      </div>

    </div>
  );
};
