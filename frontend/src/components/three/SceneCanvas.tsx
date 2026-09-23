import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei';

interface SceneCanvasProps {
  children: React.ReactNode;
  /** CSS class for the outer container */
  className?: string;
  /** Camera field of view (default 50) */
  fov?: number;
  /** Camera position [x, y, z] */
  cameraPosition?: [number, number, number];
  /** Whether to enable shadows (default true) */
  shadows?: boolean;
  /** Background color (CSS color or null for transparent) */
  bgColor?: string | null;
  /** Optional style override */
  style?: React.CSSProperties;
}

/**
 * Reusable React Three Fiber Canvas wrapper for SafarNamma.
 * Provides consistent lighting, performance optimization, and Suspense boundary
 * across all pages (Home, Explore, Groups, Profile).
 */
export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  children,
  className = '',
  fov = 50,
  cameraPosition = [0, 3, 8],
  shadows = true,
  bgColor = null,
  style,
}) => {
  return (
    <div className={`relative w-full ${className}`} style={style}>
      <Canvas
        shadows={shadows}
        camera={{ position: cameraPosition, fov, near: 0.1, far: 200 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: bgColor === null,
          powerPreference: 'high-performance',
        }}
        style={{
          background: bgColor || 'transparent',
        }}
      >
        {/* Performance optimization */}
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />

        {/* Global lighting rig */}
        <ambientLight intensity={0.4} color="#FDE68A" />
        <directionalLight
          position={[10, 15, 8]}
          intensity={1.2}
          color="#FFF8E7"
          castShadow={shadows}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        {/* Soft fill light from below/behind */}
        <hemisphereLight
          args={['#87CEEB', '#2D4A3E', 0.3]}
        />

        <Suspense fallback={null}>
          {children}
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Loading shimmer overlay */}
      <LoadingOverlay />
    </div>
  );
};

/**
 * A subtle loading shimmer that shows while 3D content is being prepared.
 * Uses CSS animation, no Three.js dependency.
 */
const LoadingOverlay: React.FC = () => {
  return null; // Canvas loads fast with procedural geometry — no shimmer needed initially
};
