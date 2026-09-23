import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SafarJeep } from './SafarJeep';

interface ExploreOverlookSceneProps {
  activeCategory?: string;
  mousePos?: { x: number; y: number };
}

export const ExploreOverlookScene: React.FC<ExploreOverlookSceneProps> = ({
  activeCategory = 'All',
  mousePos = { x: 0, y: 0 },
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const signpostRef = useRef<THREE.Group>(null);

  // Floating particles (golden pollen/leaves)
  const particleCount = 45;
  const particles = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 5 - 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return pos;
  }, []);

  const particlesRef = useRef<THREE.Points>(null);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();

    // Subtle breathing camera tilt driven by mouse
    const targetCamX = mousePos.x * 0.8;
    const targetCamY = 2.2 + mousePos.y * 0.4;
    camera.position.x += (targetCamX - camera.position.x) * 0.05;
    camera.position.y += (targetCamY - camera.position.y) * 0.05;
    camera.lookAt(0.3, 0.6, 0);

    // Animate particles
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += Math.sin(t * 1.5 + i) * 0.003 - 0.001;
        positions[i * 3] += Math.cos(t * 0.8 + i) * 0.003;
        if (positions[i * 3 + 1] < -0.5) positions[i * 3 + 1] = 4.5;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Signpost subtle bob
    if (signpostRef.current) {
      signpostRef.current.rotation.y = Math.sin(t * 0.5) * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ─── LIGHTING: Golden Hour Overlook ─── */}
      <ambientLight intensity={0.65} color="#FFE8D6" />
      <directionalLight
        position={[8, 10, 6]}
        intensity={1.8}
        color="#FFAA44"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.5} color="#6EE7B7" />

      {/* Warm fill light on Jeep */}
      <pointLight position={[1.5, 2, 2]} intensity={0.8} color="#FBBF24" distance={8} />

      {/* ─── CLIFF / OVERLOOK PLATFORM ─── */}
      {/* Rock cliff base */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[7, 9, 1.2, 16]} />
        <meshStandardMaterial color="#3D5A4C" roughness={0.9} flatShading />
      </mesh>

      {/* Overlook dirt/gravel trail edge */}
      <mesh position={[0, 0.02, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 6.8, 24]} />
        <meshStandardMaterial color="#8C7A5E" roughness={0.95} />
      </mesh>

      {/* Low stone wall / railing along the cliff edge */}
      {Array.from({ length: 9 }).map((_, i) => {
        const angle = -0.9 + i * 0.22;
        const r = 5.6;
        const x = Math.sin(angle) * r;
        const z = -Math.cos(angle) * r + 1.5;
        return (
          <group key={i} position={[x, 0.2, z]} rotation={[0, -angle, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.9, 0.45, 0.25]} />
              <meshStandardMaterial color="#5A5348" roughness={0.85} flatShading />
            </mesh>
          </group>
        );
      })}

      {/* ─── SAFARNAMMA JEEP (Parked at scenic angle) ─── */}
      <group position={[1.4, 0.02, 0.4]} rotation={[0, -0.45, 0]}>
        <SafarJeep
          position={[0, 0, 0]}
          scrollVelocity={0}
          tiltX={0}
          headlightsOn={true}
          scale={0.92}
        />
      </group>

      {/* ─── WOODEN SIGNPOST ─── */}
      <group ref={signpostRef} position={[-2.8, 0, 0.6]} rotation={[0, 0.2, 0]}>
        {/* Main Post */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 2.2, 8]} />
          <meshStandardMaterial color="#5C4033" roughness={0.9} />
        </mesh>

        {/* Post Top Cap */}
        <mesh position={[0, 2.25, 0]}>
          <coneGeometry args={[0.1, 0.2, 8]} />
          <meshStandardMaterial color="#4A3525" roughness={0.9} />
        </mesh>

        {/* Signboard 1: Treks & Hills (Points Left) */}
        <mesh position={[-0.35, 1.8, 0.04]} rotation={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.9, 0.22, 0.04]} />
          <meshStandardMaterial
            color={activeCategory === 'Treks' ? '#F59E0B' : '#7C5E43'}
            roughness={0.7}
          />
        </mesh>

        {/* Signboard 2: Waterfalls (Points Right) */}
        <mesh position={[0.32, 1.5, -0.04]} rotation={[0, -0.1, 0]} castShadow>
          <boxGeometry args={[0.85, 0.2, 0.04]} />
          <meshStandardMaterial
            color={activeCategory === 'Waterfalls' ? '#0D5C63' : '#6A4E38'}
            roughness={0.7}
          />
        </mesh>

        {/* Signboard 3: Hidden Gems (Points Left) */}
        <mesh position={[-0.3, 1.2, 0.02]} rotation={[0, 0.15, 0]} castShadow>
          <boxGeometry args={[0.8, 0.18, 0.04]} />
          <meshStandardMaterial
            color={activeCategory === 'Cafes' || activeCategory === 'Nature' ? '#F59E0B' : '#7A5B42'}
            roughness={0.7}
          />
        </mesh>

        {/* Stone base around post */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <coneGeometry args={[0.3, 0.25, 6]} />
          <meshStandardMaterial color="#4B5563" roughness={0.9} flatShading />
        </mesh>
      </group>

      {/* ─── PINE TREES ON CLIFF ─── */}
      {[
        { pos: [-4.2, 0, -1.5], scale: 1.1 },
        { pos: [-3.6, 0, -2.8], scale: 0.85 },
        { pos: [3.8, 0, -2.2], scale: 1.0 },
        { pos: [4.4, 0, -1.0], scale: 0.75 },
      ].map((tree, idx) => (
        <group key={idx} position={tree.pos as [number, number, number]} scale={tree.scale}>
          {/* Trunk */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 1.2, 6]} />
            <meshStandardMaterial color="#3E2723" roughness={0.9} />
          </mesh>
          {/* Foliage tiers */}
          <mesh position={[0, 1.6, 0]} castShadow>
            <coneGeometry args={[0.75, 1.3, 6]} />
            <meshStandardMaterial color="#1B4D3E" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 2.3, 0]} castShadow>
            <coneGeometry args={[0.55, 1.1, 6]} />
            <meshStandardMaterial color="#266352" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 2.9, 0]} castShadow>
            <coneGeometry args={[0.35, 0.8, 6]} />
            <meshStandardMaterial color="#327D67" roughness={0.8} flatShading />
          </mesh>
        </group>
      ))}

      {/* ─── DISTANT MOUNTAIN RANGES ─── */}
      {/* Layer 1 (Midground) */}
      {[-8, -3, 2, 7].map((x, i) => (
        <mesh key={`mtn-mid-${i}`} position={[x, 0.2, -9]} castShadow>
          <coneGeometry args={[4.5 + (i % 2), 5 + (i % 3) * 0.8, 5]} />
          <meshStandardMaterial color="#2D5A4C" roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* Layer 2 (Background Mist Layer) */}
      {[-11, -5, 0, 6, 11].map((x, i) => (
        <mesh key={`mtn-far-${i}`} position={[x, 1.0, -15]}>
          <coneGeometry args={[6.5, 7 + (i % 2), 5]} />
          <meshStandardMaterial color="#1D3E35" roughness={1.0} flatShading />
        </mesh>
      ))}

      {/* Mist layer floating over valley */}
      <mesh position={[0, 0.3, -8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 12]} />
        <meshStandardMaterial
          color="#FDE68A"
          transparent
          opacity={0.22}
          roughness={1}
        />
      </mesh>

      {/* ─── GOLDEN HOUR SKY BACKDROP ─── */}
      <mesh position={[0, 4, -22]}>
        <planeGeometry args={[50, 24]} />
        <meshBasicMaterial color="#FFB26B" />
      </mesh>

      {/* ─── FLOATING PARTICLES (Pollen/Breeze) ─── */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particles, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#FDE68A"
          transparent
          opacity={0.7}
        />
      </points>
    </group>
  );
};
