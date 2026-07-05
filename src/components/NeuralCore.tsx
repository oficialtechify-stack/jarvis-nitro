import React, { useRef, useEffect } from 'react';

export default function NeuralCore({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = active ? 120 : 80;
    const radius = 120;

    class Particle {
      x: number;
      y: number;
      z: number;
      px: number = 0;
      py: number = 0;
      vx: number;
      vy: number;
      vz: number;

      constructor() {
        // Spherical distribution
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        this.x = radius * Math.sin(phi) * Math.cos(theta);
        this.y = radius * Math.sin(phi) * Math.sin(theta);
        this.z = radius * Math.cos(phi);
        
        this.vx = (Math.random() - 0.5) * 0.02;
        this.vy = (Math.random() - 0.5) * 0.02;
        this.vz = (Math.random() - 0.5) * 0.02;
      }

      update() {
        // Rotation for 3D effect
        const speed = active ? 0.02 : 0.005;
        const x1 = this.x * Math.cos(speed) - this.z * Math.sin(speed);
        const z1 = this.z * Math.cos(speed) + this.x * Math.sin(speed);
        
        this.x = x1;
        this.z = z1;

        const y1 = this.y * Math.cos(speed * 0.5) - this.z * Math.sin(speed * 0.5);
        const z2 = this.z * Math.cos(speed * 0.5) + this.y * Math.sin(speed * 0.5);
        
        this.y = y1;
        this.z = z2;

        // Perspective projection
        const perspective = 400 / (400 + this.z);
        this.px = (canvas!.width / 2) + this.x * perspective;
        this.py = (canvas!.height / 2) + this.y * perspective;
      }

      draw() {
        if (!ctx) return;
        const perspective = 400 / (400 + this.z);
        const size = (this.z + radius) / (2 * radius) * 2 + 0.5;
        const alpha = (this.z + radius) / (2 * radius) * 0.8 + 0.2;

        ctx.beginPath();
        ctx.arc(this.px, this.py, size * perspective, 0, Math.PI * 2);
        ctx.fillStyle = active 
          ? `rgba(255, 255, 255, ${alpha})` 
          : `rgba(34, 211, 238, ${alpha * 0.5})`;
        ctx.fill();
        
        if (active && this.z > 0) {
          ctx.shadowBlur = 5;
          ctx.shadowColor = 'white';
        } else {
          ctx.shadowBlur = 0;
        }
      }
    }

    const init = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => p.update());

      // Draw lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].px - particles[j].px;
          const dy = particles[i].py - particles[j].py;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const maxDist = active ? 70 : 50;
          if (distance < maxDist) {
            const avgZ = (particles[i].z + particles[j].z) / 2;
            const alpha = ((avgZ + radius) / (2 * radius)) * (1 - distance / maxDist);
            
            ctx.beginPath();
            ctx.strokeStyle = active 
              ? `rgba(255, 255, 255, ${alpha})` 
              : `rgba(34, 211, 238, ${alpha * 0.3})`;
            ctx.moveTo(particles[i].px, particles[i].py);
            ctx.lineTo(particles[j].px, particles[j].py);
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => p.draw());
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    window.addEventListener('resize', init);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', init);
    };
  }, [active]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className={`w-full h-full transition-all duration-1000 ${active ? 'scale-125' : 'scale-100'}`}
      />
      {/* Dynamic Glow */}
      <div className={`absolute w-48 h-48 bg-white/5 rounded-full blur-[80px] transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-20'}`} />
    </div>
  );
}
