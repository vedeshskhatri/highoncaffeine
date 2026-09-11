import React, { useEffect, useRef } from 'react';

/**
 * AlpineSolarBackground
 * Procedural HTML5 Canvas rendering dynamic Himalayan topographic contour lines,
 * an ambient solar alpenglow aura, and drifting high-altitude solar particles.
 * 100% lightweight, hardware-accelerated 60fps, responsive to mouse movement.
 */
export default function AlpineSolarBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let time = 0;

    // Mouse tracking with smooth interpolation
    let mouse = { x: 0.7, y: 0.3, targetX: 0.7, targetY: 0.3 };

    // Atmospheric solar particles (crystallized snow & solar photons)
    const PARTICLE_COUNT = 36;
    const particles = [];

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2.0 + 0.8,
          alpha: Math.random() * 0.45 + 0.15,
          vx: (Math.random() - 0.5) * 0.35 + 0.15,
          vy: -Math.random() * 0.45 - 0.1,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.03 + 0.01,
        });
      }
    }

    function handleResize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.scale(dpr, dpr);
      initParticles();
    }

    function handleMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      mouse.targetX = clientX / width;
      mouse.targetY = clientY / height;
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    handleResize();

    // Himalayan elevation contour definitions
    const RIDGE_LAYERS = [
      { baseHeight: 0.38, amp: 48, freq: 0.0018, speed: 0.004, stroke: 'rgba(2, 132, 199, 0.065)', fill: 'rgba(240, 249, 255, 0.4)', parallax: 0.15 },
      { baseHeight: 0.50, amp: 62, freq: 0.0022, speed: 0.006, stroke: 'rgba(15, 23, 42, 0.05)', fill: 'rgba(241, 245, 249, 0.45)', parallax: 0.28 },
      { baseHeight: 0.64, amp: 75, freq: 0.0015, speed: 0.005, stroke: 'rgba(194, 65, 12, 0.06)', fill: 'rgba(255, 247, 237, 0.35)', parallax: 0.42 },
      { baseHeight: 0.76, amp: 85, freq: 0.0020, speed: 0.007, stroke: 'rgba(15, 23, 42, 0.065)', fill: 'rgba(248, 250, 252, 0.55)', parallax: 0.60 },
      { baseHeight: 0.88, amp: 95, freq: 0.0025, speed: 0.009, stroke: 'rgba(2, 132, 199, 0.075)', fill: 'rgba(255, 255, 255, 0.75)', parallax: 0.80 },
    ];

    function render() {
      time += 1;

      // Smooth mouse easing
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // ─────────────────────────────────────────────────────────
      // 1. Dynamic Solar Alpenglow Flare (Top Right Sunlight)
      // ─────────────────────────────────────────────────────────
      const sunCenterX = width * (0.75 + (mouse.x - 0.5) * 0.08);
      const sunCenterY = height * (0.22 + (mouse.y - 0.5) * 0.08);
      const sunRadius = Math.max(width * 0.45, 420);

      const sunGlow = ctx.createRadialGradient(
        sunCenterX, sunCenterY, 0,
        sunCenterX, sunCenterY, sunRadius
      );
      sunGlow.addColorStop(0, 'rgba(251, 191, 36, 0.16)');   // Solar warm amber center
      sunGlow.addColorStop(0.28, 'rgba(245, 158, 11, 0.08)'); // Alpenglow transition
      sunGlow.addColorStop(0.65, 'rgba(194, 65, 12, 0.03)');  // Terracotta ember fringe
      sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, width, height);

      // Secondary cool glacier ambient wash on bottom left
      const glacierGlow = ctx.createRadialGradient(
        width * 0.15, height * 0.85, 0,
        width * 0.15, height * 0.85, width * 0.5
      );
      glacierGlow.addColorStop(0, 'rgba(2, 132, 199, 0.05)');
      glacierGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glacierGlow;
      ctx.fillRect(0, 0, width, height);

      // ─────────────────────────────────────────────────────────
      // 2. Procedural Himalayan Elevation Contours
      // ─────────────────────────────────────────────────────────
      RIDGE_LAYERS.forEach((ridge) => {
        ctx.beginPath();
        const yOffset = height * ridge.baseHeight + (mouse.y - 0.5) * 35 * ridge.parallax;
        const xOffset = (mouse.x - 0.5) * 45 * ridge.parallax;

        ctx.moveTo(0, height);
        ctx.lineTo(0, yOffset);

        const step = 24;
        for (let x = 0; x <= width + step; x += step) {
          // Complex harmonic wave synthesis
          const primaryWave = Math.sin((x + xOffset) * ridge.freq + time * ridge.speed);
          const secondaryWave = Math.cos((x - xOffset) * (ridge.freq * 2.1) - time * (ridge.speed * 0.7));
          const tertiaryWave = Math.sin(x * (ridge.freq * 0.6) + time * 0.002);
          
          const elevation = (primaryWave * 0.55 + secondaryWave * 0.3 + tertiaryWave * 0.15) * ridge.amp;
          const y = yOffset + elevation;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Fill with soft elevation tint
        ctx.fillStyle = ridge.fill;
        ctx.fill();

        // Crisp hairline crest contour
        ctx.strokeStyle = ridge.stroke;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      });

      // ─────────────────────────────────────────────────────────
      // 3. Drifting High-Altitude Solar Photons & Ice Crystals
      // ─────────────────────────────────────────────────────────
      particles.forEach((p) => {
        p.x += p.vx + (mouse.x - 0.5) * 0.4;
        p.y += p.vy + (mouse.y - 0.5) * 0.2;
        p.pulse += p.pulseSpeed;

        // Wrap around boundaries
        if (p.x > width + 20) p.x = -20;
        if (p.x < -20) p.x = width + 20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        // Solar warm golden hue near top-right, frost cyan hue near bottom-left
        const ratio = p.x / width;
        if (ratio > 0.45) {
          ctx.fillStyle = `rgba(245, 158, 11, ${currentAlpha})`;
        } else {
          ctx.fillStyle = `rgba(2, 132, 199, ${currentAlpha * 0.75})`;
        }
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="alpine-solar-canvas"
      aria-hidden="true"
    />
  );
}
