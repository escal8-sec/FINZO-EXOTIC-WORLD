import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glareOpacity?: number;
}

export function TiltCard({
  children,
  className = '',
  maxTilt = 5,
  glareOpacity = 0.14,
}: TiltCardProps) {
  const prefersReduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [finePointer, setFinePointer] = useState(false);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareAlpha = useMotionValue(0);

  const rotateX = useSpring(rawRotateX, { stiffness: 260, damping: 24, mass: 0.6 });
  const rotateY = useSpring(rawRotateY, { stiffness: 260, damping: 24, mass: 0.6 });
  const glareAlphaSpring = useSpring(glareAlpha, { stiffness: 220, damping: 26 });

  const glareBg = useMotionTemplate`radial-gradient(360px circle at ${glareX}% ${glareY}%, rgba(165, 243, 252, ${glareOpacity}), transparent 68%)`;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setFinePointer(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (prefersReduced || !finePointer) {
    return <div className={className}>{children}</div>;
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    rawRotateX.set((0.5 - py) * maxTilt * 2);
    rawRotateY.set((px - 0.5) * maxTilt * 2);
    glareX.set(px * 100);
    glareY.set(py * 100);
    glareAlpha.set(1);
  };

  const handleMouseLeave = () => {
    rawRotateX.set(0);
    rawRotateY.set(0);
    glareAlpha.set(0);
  };

  return (
    <div style={{ perspective: 1050 }} className="h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative h-full ${className}`}
      >
        {children}
        <motion.div
          aria-hidden="true"
          style={{
            background: glareBg,
            opacity: glareAlphaSpring,
          }}
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-20"
        />
      </motion.div>
    </div>
  );
}
