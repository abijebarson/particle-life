import React, { useEffect, useRef, useState, useCallback } from 'react';

const DEFAULT_SETTINGS = {
  numParticles: 3000,
  numTypes: 3,
  particleSize: 4,
  attractForce: '1/x^2',
  repelForce: '1/x',
  friction: 0.05,
  inertia: 4.0,
  maxDistance: 120,
  forceMultiplier: 40,
  glowEffect: true,
  predatorPreyEnabled: false
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
  
  const [attractMatrix, setAttractMatrix] = useState([]);
  const [repelMatrix, setRepelMatrix] = useState([]);
  const [predatorMatrix, setPredatorMatrix] = useState([]);

  const [isRunning, setIsRunning] = useState(false);

  const [showSettings, setShowSettings] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
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
    attractMatrix, repelMatrix, predatorMatrix, attractForce, repelForce, friction, inertia, maxDistance, forceMultiplier, particleSize, numTypes, glowEffect, predatorPreyEnabled
  });

  useEffect(() => {
    configRef.current = { attractMatrix, repelMatrix, predatorMatrix, attractForce, repelForce, friction, inertia, maxDistance, forceMultiplier, particleSize, numTypes, glowEffect, predatorPreyEnabled };
  }, [attractMatrix, repelMatrix, predatorMatrix, attractForce, repelForce, friction, inertia, maxDistance, forceMultiplier, particleSize, numTypes, glowEffect, predatorPreyEnabled]);

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
        const particle = { x, y, vx: 0, vy: 0, type };
        state.particles.push(particle);
        state.grid[index] = created; 
        created++;
      }
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
    
    ctx.fillStyle = '#111827'; 
    ctx.fillRect(0, 0, simState.current.width, simState.current.height);

    const pSize = cfg.particleSize;
    const radius = pSize / 2;
    const currentTypes = cfg.numTypes;
    const isGlow = cfg.glowEffect;

    const typeColors = [];
    for(let t = 0; t < currentTypes; t++) {
       typeColors.push(hslToRgb(t / currentTypes, 1, 0.5));
    }

    ctx.globalCompositeOperation = isGlow ? 'lighter' : 'source-over';

    for (let t = 0; t < currentTypes; t++) {
      const [r, g, b] = typeColors[t];
      const colorString = `rgb(${r},${g},${b})`;
      
      ctx.fillStyle = colorString;
      
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
          ctx.moveTo(p.x + radius, p.y);
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        }
      }
      
      ctx.fill();
    }

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

  useEffect(() => {
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const forceOptions = ['exp(-x)', '-log(x)', '1/x', '1/x^2', '1/x^3'];

  if (attractMatrix.length === 0) return <div className="p-8 text-white">Initializing...</div>;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950 text-gray-200 font-sans">
      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height} 
        className="absolute inset-0 z-0 bg-black cursor-crosshair"
      />

      <div className="absolute top-4 left-4 right-4 md:right-auto z-20 flex flex-col gap-2 md:w-80 pointer-events-none">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="pointer-events-auto bg-gray-900/80 backdrop-blur-md border border-gray-700 p-3 rounded-xl shadow-lg font-bold flex justify-between items-center transition hover:bg-gray-800/90"
        >
          <span>Global Physics</span>
          <span>{showSettings ? '▲' : '▼'}</span>
        </button>
        
        {showSettings && (
          <div className="pointer-events-auto bg-gray-900/80 backdrop-blur-md p-5 rounded-xl shadow-xl border border-gray-700 flex flex-col gap-4 max-h-[45vh] md:max-h-[80vh] overflow-y-auto custom-scrollbar overflow-x-hidden">
            <div className="flex gap-2">
              <button 
                onClick={toggleSim} 
                className={`flex-1 py-2 font-bold rounded shadow-md transition text-sm ${isRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
              >
                {isRunning ? 'Pause' : 'Play'}
              </button>
              <button 
                onClick={initSimulation} 
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded shadow-md transition text-sm"
              >
                Restart
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-400 mt-2 cursor-pointer">
              <input type="checkbox" checked={glowEffect} onChange={e => setGlowEffect(e.target.checked)} className="accent-blue-500 w-4 h-4 cursor-pointer" />
              <span className="text-white font-semibold">Enable Visual Glow</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={predatorPreyEnabled} onChange={e => setPredatorPreyEnabled(e.target.checked)} className="accent-orange-500 w-4 h-4 cursor-pointer" />
              <span className="text-white font-semibold">Enable Predator / Prey</span>
            </label>

            <label className="flex flex-col text-sm text-gray-400">
              Particles (N): <span className="text-white font-mono">{numParticles}</span>
              <input type="range" min="100" max="15000" step="100" value={numParticles} onChange={e => setNumParticles(Number(e.target.value))} className="mt-1 accent-blue-500" />
            </label>

            <label className="flex flex-col text-sm text-gray-400">
              Types (M): <span className="text-white font-mono">{numTypes}</span>
              <input type="range" min="1" max="8" value={numTypes} onChange={handleTypeChange} className="mt-1 accent-blue-500" />
            </label>

            <label className="flex flex-col text-sm text-gray-400">
              Particle Size: <span className="text-white font-mono">{particleSize}px</span>
              <input type="range" min="1" max="8" step="1" value={particleSize} onChange={e => setParticleSize(Number(e.target.value))} className="mt-1 accent-yellow-500" />
            </label>

            <label className="flex flex-col text-sm text-gray-400">
              Interaction Radius: <span className="text-white font-mono">{maxDistance}px</span>
              <input type="range" min="10" max="300" value={maxDistance} onChange={e => setMaxDistance(Number(e.target.value))} className="mt-1 accent-purple-500" />
            </label>

            <label className="flex flex-col text-sm text-gray-400">
              Inertia (Mass): <span className="text-white font-mono">{inertia.toFixed(1)}</span>
              <input type="range" min="0.1" max="10" step="0.1" value={inertia} onChange={e => setInertia(Number(e.target.value))} className="mt-1 accent-orange-500" />
            </label>

            <label className="flex flex-col text-sm text-gray-400">
              Friction: <span className="text-white font-mono">{friction.toFixed(2)}</span>
              <input type="range" min="0" max="0.99" step="0.01" value={friction} onChange={e => setFriction(Number(e.target.value))} className="mt-1 accent-purple-500" />
            </label>

            <label className="flex flex-col text-sm text-gray-400">
              Force Multiplier: <span className="text-white font-mono">{forceMultiplier}</span>
              <input type="range" min="1" max="50" step="1" value={forceMultiplier} onChange={e => setForceMultiplier(Number(e.target.value))} className="mt-1 accent-pink-500" />
            </label>

            <label className="flex flex-col text-sm text-gray-400">
              Attraction Law:
              <select value={attractForce} onChange={e => setAttractForce(e.target.value)} className="mt-1 bg-gray-800 text-white p-2 rounded border border-gray-700 outline-none text-xs">
                {forceOptions.map(f => <option key={`a-${f}`} value={f}>{f}</option>)}
              </select>
            </label>

            <label className="flex flex-col text-sm text-gray-400">
              Repulsion Law:
              <select value={repelForce} onChange={e => setRepelForce(e.target.value)} className="mt-1 bg-gray-800 text-white p-2 rounded border border-gray-700 outline-none text-xs">
                {forceOptions.map(f => <option key={`r-${f}`} value={f}>{f}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 md:bottom-auto md:top-4 left-4 right-4 md:left-auto md:w-auto md:min-w-[300px] z-10 flex flex-col gap-2 pointer-events-none">
        
        <div className="flex justify-end pointer-events-auto">
          <button 
            onClick={() => randomizeMatrices(numTypes)} 
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl shadow-lg border border-gray-700 transition text-sm w-full md:w-auto"
          >
            Shuffle All Matrices
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setShowAttract(!showAttract)}
            className="pointer-events-auto bg-gray-900/80 backdrop-blur-md border border-gray-700 p-3 rounded-xl shadow-lg font-bold flex justify-between items-center transition hover:bg-gray-800/90 text-green-400"
          >
            <span>Attraction Matrix</span>
            <span className="ml-4">{showAttract ? '▲' : '▼'}</span>
          </button>
          {showAttract && (
            <div className="pointer-events-auto bg-gray-900/80 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-700 max-h-[35vh] md:max-h-[40vh] overflow-y-auto overflow-x-auto custom-scrollbar">
              <div className="grid gap-2 items-center" style={{ gridTemplateColumns: `auto repeat(${numTypes}, minmax(0, 1fr))` }}>
                <div className="w-4 h-4"></div> 
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
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setShowRepel(!showRepel)}
            className="pointer-events-auto bg-gray-900/80 backdrop-blur-md border border-gray-700 p-3 rounded-xl shadow-lg font-bold flex justify-between items-center transition hover:bg-gray-800/90 text-red-400"
          >
            <span>Repulsion Matrix</span>
            <span className="ml-4">{showRepel ? '▲' : '▼'}</span>
          </button>
          {showRepel && (
            <div className="pointer-events-auto bg-gray-900/80 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-700 max-h-[35vh] md:max-h-[40vh] overflow-y-auto overflow-x-auto custom-scrollbar">
              <div className="grid gap-2 items-center" style={{ gridTemplateColumns: `auto repeat(${numTypes}, minmax(0, 1fr))` }}>
                <div className="w-4 h-4"></div> 
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
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setShowPredator(!showPredator)}
            className="pointer-events-auto bg-gray-900/80 backdrop-blur-md border border-gray-700 p-3 rounded-xl shadow-lg font-bold flex justify-between items-center transition hover:bg-gray-800/90 text-amber-400"
          >
            <span>Predation Matrix</span>
            <span className="ml-4">{showPredator ? '▲' : '▼'}</span>
          </button>
          {showPredator && (
            <div className="pointer-events-auto bg-gray-900/80 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-700 max-h-[35vh] md:max-h-[40vh] overflow-y-auto overflow-x-auto custom-scrollbar">
              <div className="text-xs text-gray-400 mb-3 text-center">1 = Row eats Col, -1 = Row is eaten</div>
              <div className="grid gap-2 items-center" style={{ gridTemplateColumns: `auto repeat(${numTypes}, minmax(0, 1fr))` }}>
                <div className="w-4 h-4"></div> 
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

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}} />
    </div>
  );
}