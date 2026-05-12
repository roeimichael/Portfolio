import { useEffect, useRef } from "react";
import * as THREE from "three";
// @ts-expect-error - vanta has no types
import GLOBE from "vanta/dist/vanta.globe.min";

type VantaInstance = { destroy: () => void };

export default function VantaGlobe() {
  const ref = useRef<HTMLDivElement | null>(null);
  const effectRef = useRef<VantaInstance | null>(null);

  useEffect(() => {
    if (!ref.current || effectRef.current) return;
    effectRef.current = GLOBE({
      el: ref.current,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0x7c5cff,
      color2: 0x9d85ff,
      size: 0.9,
      backgroundColor: 0x0a0a0a,
    });
    return () => {
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      className="absolute inset-0"
      aria-hidden="true"
    />
  );
}
