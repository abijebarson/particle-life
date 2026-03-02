import React, { useEffect, useRef, useState, useCallback } from 'react';

const DEFAULT_SETTINGS = {
  numParticles: 1000,
  numTypes: 3,
  particleSize: 1,
  attractForce: '1/x^2',
  repelForce: '1/x',
  friction: 0.2,
  inertia: 4.0,
  maxDistance: 120,
  forceMultiplier: 40,
  glowEffect: true,
  predatorPreyEnabled: false,
  particleTrails: true,
  trailFade: 0.2,
  joinTrails: true,
  playMusic: false
};

const calculateForceValue = (type, d) => {
  const dist = d + 0.5; 
  switch (type) {
    case 'exp(-x)': return Math.exp(-dist);
    case '-log(x)': return -Math.log(dist);
    case '1/x': return 1 / dist;
    case '1/x^2': return 1 / (dist * dist);
    case '1/x^3': return 1 / (dist * dist * dist);
    default: return 0;
  }
};

const generateRandomMatrix = (size) => {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => parseFloat(((Math.random() * 2) - 1).toFixed(2)))
  );
};

const generatePredatorMatrix = (size) => {
  const mat = Array(size).fill(0).map(() => Array(size).fill(0));
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      const val = Math.floor(Math.random() * 3) - 1; 
      mat[i][j] = val;
      mat[j][i] = -val;
    }
  }
  return mat;
};

export default function App() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  const [numParticles, setNumParticles] = useState(DEFAULT_SETTINGS.numParticles);
  const [numTypes, setNumTypes] = useState(DEFAULT_SETTINGS.numTypes);
  const [particleSize, setParticleSize] = useState(DEFAULT_SETTINGS.particleSize);
  const [attractForce, setAttractForce] = useState(DEFAULT_SETTINGS.attractForce);
  const [repelForce, setRepelForce] = useState(DEFAULT_SETTINGS.repelForce);
  const [friction, setFriction] = useState(DEFAULT_SETTINGS.friction);
  const [inertia, setInertia] = useState(DEFAULT_SETTINGS.inertia);
  const [maxDistance, setMaxDistance] = useState(DEFAULT_SETTINGS.maxDistance);
  const [forceMultiplier, setForceMultiplier] = useState(DEFAULT_SETTINGS.forceMultiplier);
  const [glowEffect, setGlowEffect] = useState(DEFAULT_SETTINGS.glowEffect);
  const [predatorPreyEnabled, setPredatorPreyEnabled] = useState(DEFAULT_SETTINGS.predatorPreyEnabled);
  const [particleTrails, setParticleTrails] = useState(DEFAULT_SETTINGS.particleTrails);
  const [trailFade, setTrailFade] = useState(DEFAULT_SETTINGS.trailFade);
  const [joinTrails, setJoinTrails] = useState(DEFAULT_SETTINGS.joinTrails);
  const [playMusic, setPlayMusic] = useState(DEFAULT_SETTINGS.playMusic);
  
  const [attractMatrix, setAttractMatrix] = useState([]);
  const [repelMatrix, setRepelMatrix] = useState([]);
  const [predatorMatrix, setPredatorMatrix] = useState([]);

  const [isRunning, setIsRunning] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showAttract, setShowAttract] = useState(false);
  const [showRepel, setShowRepel] = useState(false);
  const [showPredator, setShowPredator] = useState(false);

  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600
  });

  const simState = useRef({
    particles: [],
    width: dimensions.width,
    height: dimensions.height,
    grid: new Int32Array(dimensions.width * dimensions.height).fill(-1),
  });

  const configRef = useRef({
    attractMatrix, repelMatrix, predatorMatrix, attractForce, repelForce, friction, inertia, maxDistance, forceMultiplier, particleSize, numTypes, glowEffect, predatorPreyEnabled, particleTrails, trailFade, joinTrails
  });

  useEffect(() => {
    configRef.current = { attractMatrix, repelMatrix, predatorMatrix, attractForce, repelForce, friction, inertia, maxDistance, forceMultiplier, particleSize, numTypes, glowEffect, predatorPreyEnabled, particleTrails, trailFade, joinTrails };
  }, [attractMatrix, repelMatrix, predatorMatrix, attractForce, repelForce, friction, inertia, maxDistance, forceMultiplier, particleSize, numTypes, glowEffect, predatorPreyEnabled, particleTrails, trailFade, joinTrails]);

  // Audio Playback Controller
  useEffect(() => {
    if (!audioRef.current) return;
    if (playMusic) {
      audioRef.current.play().catch(e => {
        console.warn("Music could not be played. Make sure 'assets/music.mp3' exists and user has interacted with the document.", e);
        setPlayMusic(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [playMusic]);

  const randomizeMatrices = useCallback((size) => {
    setAttractMatrix(generateRandomMatrix(size));
    setRepelMatrix(generateRandomMatrix(size));
    setPredatorMatrix(generatePredatorMatrix(size));
  }, []);

  useEffect(() => {
    randomizeMatrices(numTypes);

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setDimensions({ width: w, height: h });
      simState.current.width = w;
      simState.current.height = h;
      simState.current.grid = new Int32Array(w * h).fill(-1);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 
    
    return () => window.removeEventListener('resize', handleResize);
  }, []); 

  const handleTypeChange = (e) => {
    const newTypes = parseInt(e.target.value, 10);
    setNumTypes(newTypes);
    randomizeMatrices(newTypes);
  };

  const handleMatrixChange = (matrixType, row, col, val) => {
    const numericVal = parseFloat(val) || 0;
    if (matrixType === 'attract') {
      const newMat = attractMatrix.map((r, i) => i === row ? r.map((c, j) => j === col ? numericVal : c) : r);
      setAttractMatrix(newMat);
    } else {
      const newMat = repelMatrix.map((r, i) => i === row ? r.map((c, j) => j === col ? numericVal : c) : r);
      setRepelMatrix(newMat);
    }
  };

  const handlePredatorMatrixChange = (row, col, val) => {
    let numericVal = parseInt(val, 10) || 0;
    if (numericVal > 1) numericVal = 1;
    if (numericVal < -1) numericVal = -1;
    if (row === col) numericVal = 0; 

    setPredatorMatrix(prev => {
      const newMat = prev.map(r => [...r]);
      newMat[row][col] = numericVal;
      newMat[col][row] = -numericVal; 
      return newMat;
    });
  };

  const handleWheel = (e, matrixType, row, col, val) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const currentVal = parseFloat(val) || 0;
    const newVal = (Math.round((currentVal + delta) * 10) / 10).toFixed(1);
    handleMatrixChange(matrixType, row, col, newVal);
  };

  const handlePredatorWheel = (e, row, col, val) => {
    const delta = e.deltaY > 0 ? -1 : 1;
    const currentVal = parseInt(val, 10) || 0;
    handlePredatorMatrixChange(row, col, currentVal + delta);
  };

  const initSimulation = useCallback(() => {
    const state = simState.current;
    state.particles = [];
    state.grid.fill(-1); 
    
    let created = 0;
    while (created < numParticles) {
      const x = Math.floor(Math.random() * state.width);
      const y = Math.floor(Math.random() * state.height);
      const index = y * state.width + x;
      
      if (state.grid[index] === -1) {
        const type = Math.floor(Math.random() * numTypes);
        const particle = { x, y, prevX: x, prevY: y, vx: 0, vy: 0, type };
        state.particles.push(particle);
        state.grid[index] = created; 
        created++;
      }
    }
    
    // Hard clear the canvas when manually resetting (Pure Black Background)
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, state.width, state.height);
    }
    
    draw(state.particles);
  }, [numParticles, numTypes]);

  useEffect(() => {
    if (attractMatrix.length > 0 && predatorMatrix.length > 0) {
      initSimulation();
    }
  }, [initSimulation, attractMatrix.length, predatorMatrix.length]);

  const updateSimulation = useCallback(() => {
    const state = simState.current;
    const cfg = configRef.current;
    
    if (!cfg.attractMatrix.length || !cfg.repelMatrix.length || !cfg.predatorMatrix.length) {
      animationRef.current = requestAnimationFrame(updateSimulation);
      return;
    }

    const { width, height, particles, grid } = state;
    grid.fill(-1); 

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x = ((p.x % width) + width) % width;
      p.y = ((p.y % height) + height) % height;
      const gridIdx = Math.floor(p.y) * width + Math.floor(p.x);
      grid[gridIdx] = i; 
    }

    for (let i = 0; i < particles.length; i++) {
      let p1 = particles[i];
      let fx = 0;
      let fy = 0;

      for (let j = 0; j < particles.length; j++) {
        if (i === j) continue;
        let p2 = particles[j];
        
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        
        if (dx > width / 2) dx -= width; else if (dx < -width / 2) dx += width;
        if (dy > height / 2) dy -= height; else if (dy < -height / 2) dy += height;

        const dSq = dx * dx + dy * dy;
        
        if (dSq > 0 && dSq < cfg.maxDistance * cfg.maxDistance) {
          const d = Math.sqrt(dSq);
          const attractScale = cfg.attractMatrix[p1.type]?.[p2.type] || 0;
          const repelScale = cfg.repelMatrix[p1.type]?.[p2.type] || 0;
          
          const fAttract = attractScale * calculateForceValue(cfg.attractForce, d);
          const fRepel = repelScale * calculateForceValue(cfg.repelForce, d);
          
          const netForce = (fAttract - fRepel) * cfg.forceMultiplier;
          
          fx += (netForce * dx) / d;
          fy += (netForce * dy) / d;
        }
      }
      
      p1.vx = (p1.vx + (fx / cfg.inertia)) * (1 - cfg.friction);
      p1.vy = (p1.vy + (fy / cfg.inertia)) * (1 - cfg.friction);
    }

    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      let oldX = Math.floor(p.x);
      let oldY = Math.floor(p.y);
      
      p.prevX = p.x;
      p.prevY = p.y;
      
      let newX = Math.floor(p.x + p.vx);
      let newY = Math.floor(p.y + p.vy);

      newX = ((newX % width) + width) % width;
      newY = ((newY % height) + height) % height;

      const oldIdx = oldY * width + oldX;
      const newIdx = newY * width + newX;
      const targetIdx = grid[newIdx];

      if (targetIdx === -1 || targetIdx === i) {
        if (oldIdx !== newIdx) {
          grid[oldIdx] = -1;
          grid[newIdx] = i;
        }
        p.x = newX;
        p.y = newY;
      } else {
        if (cfg.predatorPreyEnabled) {
          const targetParticle = particles[targetIdx];
          const relation = cfg.predatorMatrix[p.type]?.[targetParticle.type] || 0;
          
          if (relation === 1) {
            targetParticle.type = p.type;
          } else if (relation === -1) {
            p.type = targetParticle.type;
          }
        }

        p.vx *= -0.5;
        p.vy *= -0.5;
        p.x = oldX;
        p.y = oldY;
      }
    }

    draw(particles);
    animationRef.current = requestAnimationFrame(updateSimulation);
  }, []);

  const draw = (particles) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cfg = configRef.current;
    
    // Reset composite operation to normal to draw background
    ctx.globalCompositeOperation = 'source-over';
    
    if (cfg.particleTrails) {
      // Pure black fading trail
      ctx.fillStyle = `rgba(0, 0, 0, ${cfg.trailFade})`; 
    } else {
      ctx.fillStyle = '#000000'; 
    }
    ctx.fillRect(0, 0, simState.current.width, simState.current.height);

    const pSize = cfg.particleSize;
    const radius = pSize / 2;
    const currentTypes = cfg.numTypes;
    const isGlow = cfg.glowEffect;

    const typeColors = [];
    for(let t = 0; t < currentTypes; t++) {
       typeColors.push(hslToRgb(t / currentTypes, 1, 0.5));
    }

    // Set lighter operation for the particles to create an additive blending glow
    ctx.globalCompositeOperation = isGlow ? 'lighter' : 'source-over';

    for (let t = 0; t < currentTypes; t++) {
      const [r, g, b] = typeColors[t];
      const colorString = `rgb(${r},${g},${b})`;
      
      ctx.fillStyle = colorString;
      ctx.strokeStyle = colorString;
      ctx.lineWidth = pSize;
      ctx.lineCap = 'round';
      
      if (isGlow) {
        ctx.shadowBlur = pSize * 4 + 4;
        ctx.shadowColor = colorString;
      } else {
        ctx.shadowBlur = 0;
      }
      
      ctx.beginPath();
      
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].type === t) {
          const p = particles[i];
          if (cfg.joinTrails) {
            if (Math.abs(p.x - p.prevX) < simState.current.width / 2 && 
                Math.abs(p.y - p.prevY) < simState.current.height / 2) {
              ctx.moveTo(p.prevX, p.prevY);
              ctx.lineTo(p.x, p.y);
            } else {
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + 0.1, p.y); 
            }
          } else {
            ctx.moveTo(p.x + radius, p.y);
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          }
        }
      }
      
      if (cfg.joinTrails) {
        ctx.stroke();
      } else {
        ctx.fill();
      }
    }

    // Always restore state
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
  };

  const hslToRgb = (h, s, l) => {
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  const toggleSim = () => {
    if (isRunning) {
      cancelAnimationFrame(animationRef.current);
    } else {
      animationRef.current = requestAnimationFrame(updateSimulation);
    }
    setIsRunning(!isRunning);
  };

  const togglePanel = (panel) => {
    setShowSettings(panel === 'settings' ? !showSettings : false);
    setShowAttract(panel === 'attract' ? !showAttract : false);
    setShowRepel(panel === 'repel' ? !showRepel : false);
    setShowPredator(panel === 'predator' ? !showPredator : false);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const forceOptions = ['exp(-x)', '-log(x)', '1/x', '1/x^2', '1/x^3'];

  if (attractMatrix.length === 0) return <div className="p-8 text-white flex justify-center items-center h-screen bg-black">Initializing...</div>;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-gray-200 font-sans">
      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height} 
        className="absolute inset-0 z-0 bg-black cursor-crosshair"
      />

      {/* Hidden audio element for music */}
      <audio ref={audioRef} src="assets/music.mp3" loop preload="none" />

      {/* Bottom Centralized Dock */}
      <div className="absolute bottom-4 left-0 right-0 z-20 flex flex-col items-center gap-2 pointer-events-none">
        
        {/* Expanded Panels Container */}
        <div className="w-auto max-w-[calc(100vw-2rem)] flex flex-col items-center">
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="pointer-events-auto bg-gray-900/85 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-700 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar w-72 md:w-80">
              
              <div className="grid grid-cols-2 gap-3 border-b border-gray-700 pb-3">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white transition">
                  <input type="checkbox" checked={glowEffect} onChange={e => setGlowEffect(e.target.checked)} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                  <span>Glow</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white transition">
                  <input type="checkbox" checked={particleTrails} onChange={e => setParticleTrails(e.target.checked)} className="accent-purple-500 w-4 h-4 cursor-pointer" />
                  <span>Trails</span>
                </label>
                
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white transition">
                  <input type="checkbox" checked={predatorPreyEnabled} onChange={e => setPredatorPreyEnabled(e.target.checked)} className="accent-orange-500 w-4 h-4 cursor-pointer" />
                  <span>Predation</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white transition">
                  <input type="checkbox" checked={playMusic} onChange={e => setPlayMusic(e.target.checked)} className="accent-pink-500 w-4 h-4 cursor-pointer" />
                  <span>Music</span>
                </label>
              </div>
              
              {particleTrails && (
                <div className="flex flex-col gap-2 pl-3 border-l-2 border-purple-500/50 ml-1">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white transition">
                    <input type="checkbox" checked={joinTrails} onChange={e => setJoinTrails(e.target.checked)} className="accent-purple-500 w-4 h-4 cursor-pointer" />
                    <span>Join Trails</span>
                  </label>
                  <label className="flex flex-col text-xs text-gray-400">
                    Fade Rate: <span className="text-white font-mono">{trailFade.toFixed(2)}</span>
                    <input type="range" min="0.01" max="1.0" step="0.01" value={trailFade} onChange={e => setTrailFade(Number(e.target.value))} className="mt-1 accent-purple-500" />
                  </label>
                </div>
              )}
              
              <label className="flex flex-col text-xs text-gray-400 mt-1">
                Particles (N): <span className="text-white font-mono">{numParticles}</span>
                <input type="range" min="100" max="15000" step="100" value={numParticles} onChange={e => setNumParticles(Number(e.target.value))} className="mt-1 accent-blue-500" />
              </label>

              <label className="flex flex-col text-xs text-gray-400">
                Types (M): <span className="text-white font-mono">{numTypes}</span>
                <input type="range" min="1" max="8" value={numTypes} onChange={handleTypeChange} className="mt-1 accent-blue-500" />
              </label>

              <label className="flex flex-col text-xs text-gray-400">
                Particle Size: <span className="text-white font-mono">{particleSize}px</span>
                <input type="range" min="1" max="8" step="1" value={particleSize} onChange={e => setParticleSize(Number(e.target.value))} className="mt-1 accent-yellow-500" />
              </label>

              <label className="flex flex-col text-xs text-gray-400">
                Interaction Radius: <span className="text-white font-mono">{maxDistance}px</span>
                <input type="range" min="10" max="300" value={maxDistance} onChange={e => setMaxDistance(Number(e.target.value))} className="mt-1 accent-purple-500" />
              </label>

              <label className="flex flex-col text-xs text-gray-400">
                Inertia (Mass): <span className="text-white font-mono">{inertia.toFixed(1)}</span>
                <input type="range" min="0.1" max="10" step="0.1" value={inertia} onChange={e => setInertia(Number(e.target.value))} className="mt-1 accent-orange-500" />
              </label>

              <label className="flex flex-col text-xs text-gray-400">
                Friction: <span className="text-white font-mono">{friction.toFixed(2)}</span>
                <input type="range" min="0" max="0.99" step="0.01" value={friction} onChange={e => setFriction(Number(e.target.value))} className="mt-1 accent-purple-500" />
              </label>

              <label className="flex flex-col text-xs text-gray-400">
                Force Multiplier: <span className="text-white font-mono">{forceMultiplier}</span>
                <input type="range" min="1" max="50" step="1" value={forceMultiplier} onChange={e => setForceMultiplier(Number(e.target.value))} className="mt-1 accent-pink-500" />
              </label>

              <label className="flex flex-col text-xs text-gray-400">
                Attraction Law:
                <select value={attractForce} onChange={e => setAttractForce(e.target.value)} className="mt-1 bg-gray-800 text-white p-1.5 rounded border border-gray-700 outline-none text-xs">
                  {forceOptions.map(f => <option key={`a-${f}`} value={f}>{f}</option>)}
                </select>
              </label>

              <label className="flex flex-col text-xs text-gray-400">
                Repulsion Law:
                <select value={repelForce} onChange={e => setRepelForce(e.target.value)} className="mt-1 bg-gray-800 text-white p-1.5 rounded border border-gray-700 outline-none text-xs">
                  {forceOptions.map(f => <option key={`r-${f}`} value={f}>{f}</option>)}
                </select>
              </label>
            </div>
          )}

          {/* Attraction Panel */}
          {showAttract && (
            <div className="pointer-events-auto bg-gray-900/85 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-700 max-h-[50vh] overflow-y-auto overflow-x-auto custom-scrollbar w-auto">
              <div className="text-xs text-green-400 mb-3 font-bold uppercase tracking-wider text-center flex justify-center items-center gap-1">
                <span>🧲</span> Attraction Matrix
              </div>
              <div className="grid gap-1.5 items-center" style={{ gridTemplateColumns: `auto repeat(${numTypes}, minmax(0, 1fr))` }}>
                <div className="w-3 h-3"></div> 
                {Array.from({ length: numTypes }).map((_, j) => (
                  <div key={`col-hdr-${j}`} className="flex justify-center pb-1">
                    <div className="w-3 h-3 rounded-full border border-gray-600 shadow-sm" style={{ backgroundColor: `hsl(${(j / numTypes) * 360}, 100%, 50%)` }}></div>
                  </div>
                ))}

                {attractMatrix.map((row, i) => (
                  <React.Fragment key={`att-row-${i}`}>
                    <div className="flex justify-center pr-2">
                      <div className="w-3 h-3 rounded-full border border-gray-600 shadow-sm" style={{ backgroundColor: `hsl(${(i / numTypes) * 360}, 100%, 50%)` }}></div>
                    </div>
                    {row.map((val, j) => (
                      <input
                        key={`att-${i}-${j}`}
                        type="number"
                        step="0.1"
                        value={val}
                        onChange={(e) => handleMatrixChange('attract', i, j, e.target.value)}
                        onWheel={(e) => handleWheel(e, 'attract', i, j, val)}
                        className={`w-12 sm:w-16 text-center bg-gray-800 font-mono p-1 rounded border border-gray-700 focus:border-green-500 outline-none text-xs ${parseFloat(val) < 0 ? 'text-red-300' : 'text-green-300'}`}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Repulsion Panel */}
          {showRepel && (
            <div className="pointer-events-auto bg-gray-900/85 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-700 max-h-[50vh] overflow-y-auto overflow-x-auto custom-scrollbar w-auto">
              <div className="text-xs text-red-400 mb-3 font-bold uppercase tracking-wider text-center flex justify-center items-center gap-1">
                <span>🛡️</span> Repulsion Matrix
              </div>
              <div className="grid gap-1.5 items-center" style={{ gridTemplateColumns: `auto repeat(${numTypes}, minmax(0, 1fr))` }}>
                <div className="w-3 h-3"></div> 
                {Array.from({ length: numTypes }).map((_, j) => (
                  <div key={`col-hdr-${j}`} className="flex justify-center pb-1">
                    <div className="w-3 h-3 rounded-full border border-gray-600 shadow-sm" style={{ backgroundColor: `hsl(${(j / numTypes) * 360}, 100%, 50%)` }}></div>
                  </div>
                ))}

                {repelMatrix.map((row, i) => (
                  <React.Fragment key={`rep-row-${i}`}>
                    <div className="flex justify-center pr-2">
                      <div className="w-3 h-3 rounded-full border border-gray-600 shadow-sm" style={{ backgroundColor: `hsl(${(i / numTypes) * 360}, 100%, 50%)` }}></div>
                    </div>
                    {row.map((val, j) => (
                      <input
                        key={`rep-${i}-${j}`}
                        type="number"
                        step="0.1"
                        value={val}
                        onChange={(e) => handleMatrixChange('repulsion', i, j, e.target.value)}
                        onWheel={(e) => handleWheel(e, 'repulsion', i, j, val)}
                        className={`w-12 sm:w-16 text-center bg-gray-800 font-mono p-1 rounded border border-gray-700 focus:border-red-500 outline-none text-xs ${parseFloat(val) < 0 ? 'text-green-300' : 'text-red-300'}`}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Predation Panel */}
          {showPredator && (
            <div className="pointer-events-auto bg-gray-900/85 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-700 max-h-[50vh] overflow-y-auto overflow-x-auto custom-scrollbar w-auto">
              <div className="text-xs text-amber-400 mb-1 font-bold uppercase tracking-wider text-center flex justify-center items-center gap-1">
                <span>🦖</span> Predation Matrix
              </div>
              <div className="text-[10px] text-gray-400 mb-3 text-center">1 = Row eats Col, -1 = Row is eaten</div>
              <div className="grid gap-1.5 items-center" style={{ gridTemplateColumns: `auto repeat(${numTypes}, minmax(0, 1fr))` }}>
                <div className="w-3 h-3"></div> 
                {Array.from({ length: numTypes }).map((_, j) => (
                  <div key={`col-hdr-${j}`} className="flex justify-center pb-1">
                    <div className="w-3 h-3 rounded-full border border-gray-600 shadow-sm" style={{ backgroundColor: `hsl(${(j / numTypes) * 360}, 100%, 50%)` }}></div>
                  </div>
                ))}

                {predatorMatrix.map((row, i) => (
                  <React.Fragment key={`pred-row-${i}`}>
                    <div className="flex justify-center pr-2">
                      <div className="w-3 h-3 rounded-full border border-gray-600 shadow-sm" style={{ backgroundColor: `hsl(${(i / numTypes) * 360}, 100%, 50%)` }}></div>
                    </div>
                    {row.map((val, j) => (
                      <input
                        key={`pred-${i}-${j}`}
                        type="number"
                        step="1"
                        min="-1"
                        max="1"
                        value={val}
                        onChange={(e) => handlePredatorMatrixChange(i, j, e.target.value)}
                        onWheel={(e) => handlePredatorWheel(e, i, j, val)}
                        className={`w-12 sm:w-16 text-center bg-gray-800 font-mono p-1 rounded border border-gray-700 focus:border-amber-500 outline-none text-xs ${val === 1 ? 'text-green-400' : val === -1 ? 'text-red-400' : 'text-gray-500'}`}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Unified Bottom Row separated into distinct sections */}
        <div className="flex flex-row gap-2 md:gap-4 mb-2 pointer-events-none">
          
          {/* Playback Controls Section */}
          <div className="flex flex-row gap-1.5 pointer-events-auto bg-gray-900/60 backdrop-blur-lg p-2 rounded-2xl shadow-2xl border border-gray-700 items-center justify-center">
            <button 
              onClick={toggleSim} 
              title={isRunning ? 'Pause' : 'Play'}
              className={`w-10 h-10 flex justify-center items-center font-bold rounded-xl shadow-inner transition text-lg ${isRunning ? 'bg-red-600/90 hover:bg-red-500 text-white' : 'bg-green-600/90 hover:bg-green-500 text-white'}`}
            >
              {isRunning ? '⏸' : '▶'}
            </button>
            <button 
              onClick={initSimulation} 
              title="Restart"
              className="w-10 h-10 flex justify-center items-center bg-blue-600/90 hover:bg-blue-500 text-white font-bold rounded-xl shadow-inner transition text-xl"
            >
              ↺
            </button>
          </div>

          {/* Toggle Menus Section */}
          <div className="flex flex-row gap-1.5 pointer-events-auto bg-gray-900/60 backdrop-blur-lg p-2 rounded-2xl shadow-2xl border border-gray-700 items-center justify-center">
            <button 
              onClick={() => togglePanel('settings')}
              title="Physics Settings"
              className={`w-10 h-10 flex justify-center items-center rounded-xl shadow-inner font-bold transition text-lg border ${showSettings ? 'bg-gray-800 border-blue-500 text-blue-400' : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:border-blue-400 hover:text-blue-400'}`}
            >
              ⚙️
            </button>
            <button 
              onClick={() => togglePanel('attract')}
              title="Attraction Matrix"
              className={`w-10 h-10 flex justify-center items-center rounded-xl shadow-inner font-bold transition text-lg border ${showAttract ? 'bg-gray-800 border-green-500 text-green-400' : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:border-green-400 hover:text-green-400'}`}
            >
              🧲
            </button>
            <button 
              onClick={() => togglePanel('repel')}
              title="Repulsion Matrix"
              className={`w-10 h-10 flex justify-center items-center rounded-xl shadow-inner font-bold transition text-lg border ${showRepel ? 'bg-gray-800 border-red-500 text-red-400' : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:border-red-400 hover:text-red-400'}`}
            >
              🛡️
            </button>
            <button 
              onClick={() => togglePanel('predator')}
              title="Predation Matrix"
              className={`w-10 h-10 flex justify-center items-center rounded-xl shadow-inner font-bold transition text-lg border ${showPredator ? 'bg-gray-800 border-amber-500 text-amber-400' : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:border-amber-400 hover:text-amber-400'}`}
            >
              🦖
            </button>
          </div>

          {/* Shuffle Section (Moved to the right) */}
          <div className="flex flex-row gap-1.5 pointer-events-auto bg-gray-900/60 backdrop-blur-lg p-2 rounded-2xl shadow-2xl border border-gray-700 items-center justify-center">
            <button 
              onClick={() => randomizeMatrices(numTypes)} 
              title="Shuffle Matrices"
              className="w-10 h-10 flex justify-center items-center bg-purple-600/90 hover:bg-purple-500 text-white font-bold rounded-xl shadow-inner transition text-xl"
            >
              🔀
            </button>
          </div>

        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}} />
    </div>
  );
}