import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Environment3DProps {
  /** Scroll progress 0-1 to drive lighting transitions */
  progress?: number;
  /** Show particles (dust/fireflies) */
  particles?: boolean;
  /** The visual "time of day": 'sunset' | 'dusk' | 'night' | 'dawn' */
  timeOfDay?: 'sunset' | 'dusk' | 'night' | 'dawn';
}

/**
 * Shared 3D world environment for SafarNamma.
 * Includes rolling terrain, sky dome with time-of-day transitions,
 * ambient particles, and Gulmohar trees.
 */
export const Environment3D: React.FC<Environment3DProps> = ({
  progress = 0,
  particles = true,
  timeOfDay = 'sunset',
}) => {
  return (
    <group>
      {/* Ground plane */}
      <GroundPlane />

      {/* Road surface */}
      <RoadSurface />

      {/* Sky dome */}
      <SkyDome timeOfDay={timeOfDay} progress={progress} />

      {/* Scattered trees */}
      <TreeCluster />

      {/* Ambient particles */}
      {particles && <AmbientParticles timeOfDay={timeOfDay} />}
    </group>
  );
};

// ─── GROUND PLANE ─────────────────────────────────────────────────
const GroundPlane: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial
        color="#4A7C59"
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  );
};

// ─── ROAD SURFACE ─────────────────────────────────────────────────
const RoadSurface: React.FC = () => {
  return (
    <group>
      {/* Main asphalt road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.54, 0]} receiveShadow>
        <planeGeometry args={[3.5, 100]} />
        <meshStandardMaterial color="#3A3A3A" roughness={0.85} />
      </mesh>

      {/* Yellow dashed center line */}
      {Array.from({ length: 25 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.535, -50 + i * 4]}
        >
          <planeGeometry args={[0.08, 1.5]} />
          <meshStandardMaterial color="#EAB308" emissive="#EAB308" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// ─── SKY DOME ─────────────────────────────────────────────────────
const SkyDome: React.FC<{ timeOfDay: string; progress: number }> = ({ timeOfDay }) => {
  const skyColor = useMemo(() => {
    switch (timeOfDay) {
      case 'sunset': return new THREE.Color('#FF8C42');
      case 'dusk': return new THREE.Color('#4A2F6F');
      case 'night': return new THREE.Color('#071E22');
      case 'dawn': return new THREE.Color('#FFB347');
      default: return new THREE.Color('#87CEEB');
    }
  }, [timeOfDay]);

  const horizonColor = useMemo(() => {
    switch (timeOfDay) {
      case 'sunset': return new THREE.Color('#FFD700');
      case 'dusk': return new THREE.Color('#EA580C');
      case 'night': return new THREE.Color('#0D5C63');
      case 'dawn': return new THREE.Color('#F59E0B');
      default: return new THREE.Color('#FFF8E7');
    }
  }, [timeOfDay]);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[80, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        uniforms={{
          topColor: { value: skyColor },
          bottomColor: { value: horizonColor },
          offset: { value: 10 },
          exponent: { value: 0.6 },
        }}
        vertexShader={`
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          uniform float offset;
          uniform float exponent;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
          }
        `}
      />
    </mesh>
  );
};

// ─── STYLIZED LOW-POLY TREE ───────────────────────────────────────
const Tree: React.FC<{ position: [number, number, number]; scale?: number; isGulmohar?: boolean }> = ({
  position,
  scale = 1,
  isGulmohar = false,
}) => {
  const trunkColor = '#5D4037';
  const foliageColor = isGulmohar ? '#E26838' : '#2D6B22';

  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 1.0, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>

      {/* Foliage (low-poly cone clusters) */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <coneGeometry args={[0.6, 1.0, 6]} />
        <meshStandardMaterial color={foliageColor} roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <coneGeometry args={[0.45, 0.8, 6]} />
        <meshStandardMaterial color={foliageColor} roughness={0.8} flatShading />
      </mesh>
      {isGulmohar && (
        <mesh position={[0, 2.0, 0]} castShadow>
          <coneGeometry args={[0.3, 0.5, 6]} />
          <meshStandardMaterial color="#FF6B35" roughness={0.8} flatShading />
        </mesh>
      )}
    </group>
  );
};

// ─── TREE CLUSTER ─────────────────────────────────────────────────
const TreeCluster: React.FC = () => {
  const trees = useMemo(() => [
    // Left side of road
    { pos: [-4, -0.55, -8] as [number, number, number], s: 1.2, g: true },
    { pos: [-5, -0.55, -2] as [number, number, number], s: 0.9, g: false },
    { pos: [-3.5, -0.55, 5] as [number, number, number], s: 1.1, g: true },
    { pos: [-6, -0.55, 12] as [number, number, number], s: 0.8, g: false },
    { pos: [-4.5, -0.55, -15] as [number, number, number], s: 1.0, g: false },
    { pos: [-3, -0.55, 18] as [number, number, number], s: 1.3, g: true },
    // Right side of road
    { pos: [4, -0.55, -5] as [number, number, number], s: 1.0, g: false },
    { pos: [5.5, -0.55, 3] as [number, number, number], s: 1.1, g: true },
    { pos: [3.5, -0.55, 10] as [number, number, number], s: 0.7, g: false },
    { pos: [6, -0.55, -12] as [number, number, number], s: 0.9, g: true },
    { pos: [4.5, -0.55, 15] as [number, number, number], s: 1.0, g: false },
    { pos: [3, -0.55, -20] as [number, number, number], s: 1.2, g: true },
  ], []);

  return (
    <group>
      {trees.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.s} isGulmohar={t.g} />
      ))}
    </group>
  );
};

// ─── AMBIENT PARTICLES ────────────────────────────────────────────
const AmbientParticles: React.FC<{ timeOfDay: string }> = ({ timeOfDay }) => {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const particleColor = timeOfDay === 'night'
      ? new THREE.Color('#F59E0B')  // Fireflies
      : new THREE.Color('#FDE68A');  // Dust motes

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      colors[i * 3] = particleColor.r;
      colors[i * 3 + 1] = particleColor.g;
      colors[i * 3 + 2] = particleColor.b;
    }

    return { positions, colors };
  }, [timeOfDay]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
      // Gentle floating motion
      const posAttr = ref.current.geometry.attributes.position;
      if (posAttr) {
        for (let i = 0; i < posAttr.count; i++) {
          const y = posAttr.getY(i);
          posAttr.setY(i, y + Math.sin(Date.now() * 0.001 + i) * 0.002);
        }
        posAttr.needsUpdate = true;
      }
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={timeOfDay === 'night' ? 0.08 : 0.04}
        vertexColors
        transparent
        opacity={timeOfDay === 'night' ? 0.9 : 0.5}
        sizeAttenuation
      />
    </points>
  );
};
