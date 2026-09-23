import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SafarJeep } from './SafarJeep';

interface BasecampSceneProps {
  mousePos?: { x: number; y: number };
}

export const BasecampScene: React.FC<BasecampSceneProps> = ({
  mousePos = { x: 0, y: 0 },
}) => {
  const fireLightRef = useRef<THREE.PointLight>(null);
  const flameGroupRef = useRef<THREE.Group>(null);
  const embersRef = useRef<THREE.Points>(null);

  // Spark / Ember particles
  const emberCount = 35;
  const emberPositions = useMemo(() => {
    const pos = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1.2;
      pos[i * 3 + 1] = Math.random() * 2.5 + 0.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    }
    return pos;
  }, []);

  // Starfield particles in night sky
  const starCount = 80;
  const starPositions = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 1] = Math.random() * 12 + 2;
      pos[i * 3 + 2] = -10 - Math.random() * 15;
    }
    return pos;
  }, []);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();

    // Subtle camera parallax from mouse
    const targetCamX = mousePos.x * 0.9;
    const targetCamY = 2.4 + mousePos.y * 0.3;
    camera.position.x += (targetCamX - camera.position.x) * 0.04;
    camera.position.y += (targetCamY - camera.position.y) * 0.04;
    camera.lookAt(0.2, 0.7, 0);

    // Campfire light flicker simulation (realistic 1/f noise flicker)
    if (fireLightRef.current) {
      const flicker =
        Math.sin(t * 12) * 0.3 +
        Math.sin(t * 23) * 0.2 +
        Math.sin(t * 7) * 0.15;
      fireLightRef.current.intensity = 2.2 + flicker;
      fireLightRef.current.color.setHSL(0.08 + Math.sin(t * 5) * 0.02, 0.95, 0.55);
    }

    // Flame mesh breathing/pulsing
    if (flameGroupRef.current) {
      flameGroupRef.current.scale.y = 1 + Math.sin(t * 14) * 0.15;
      flameGroupRef.current.scale.x = 1 + Math.cos(t * 10) * 0.1;
      flameGroupRef.current.rotation.y = t * 0.5;
    }

    // Ember particles rising and floating away
    if (embersRef.current) {
      const positions = embersRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < emberCount; i++) {
        positions[i * 3 + 1] += 0.025; // rise
        positions[i * 3] += Math.sin(t * 2 + i) * 0.008; // drift x
        positions[i * 3 + 2] += Math.cos(t * 1.5 + i) * 0.008; // drift z

        // Reset if too high
        if (positions[i * 3 + 1] > 3.2) {
          positions[i * 3 + 1] = 0.3;
          positions[i * 3] = (Math.random() - 0.5) * 0.6;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
        }
      }
      embersRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* ─── AMBIENT NIGHT / TWILIGHT LIGHTING ─── */}
      <ambientLight intensity={0.25} color="#1E293B" />
      <directionalLight
        position={[-6, 12, 4]}
        intensity={0.4}
        color="#93C5FD" // Moonlight
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* ─── CAMPGROUND GROUND (Clearing in pine woods) ─── */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[8, 9.5, 1.2, 20]} />
        <meshStandardMaterial color="#1C382B" roughness={0.95} flatShading />
      </mesh>

      {/* Dirt clearing ring */}
      <mesh position={[0, 0.02, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 4.5, 20]} />
        <meshStandardMaterial color="#3E342B" roughness={0.95} />
      </mesh>

      {/* ─── CAMPFIRE (Centerpiece) ─── */}
      <group position={[-0.8, 0, 0.2]}>
        {/* Stone ring */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const r = 0.55;
          return (
            <mesh
              key={`stone-${i}`}
              position={[Math.cos(angle) * r, 0.08, Math.sin(angle) * r]}
              castShadow
            >
              <sphereGeometry args={[0.13, 6, 6]} />
              <meshStandardMaterial color="#57534E" roughness={0.9} flatShading />
            </mesh>
          );
        })}

        {/* Firewood logs (criss-cross) */}
        {[0, 60, 120].map((rot, i) => (
          <mesh
            key={`log-${i}`}
            position={[0, 0.1, 0]}
            rotation={[0.2, (rot * Math.PI) / 180, 0.3]}
            castShadow
          >
            <cylinderGeometry args={[0.06, 0.07, 0.8, 6]} />
            <meshStandardMaterial color="#382415" roughness={0.9} />
          </mesh>
        ))}

        {/* Animated Low-poly Flame Core */}
        <group ref={flameGroupRef} position={[0, 0.25, 0]}>
          <mesh>
            <coneGeometry args={[0.28, 0.65, 5]} />
            <meshStandardMaterial
              color="#FF5722"
              emissive="#FF7043"
              emissiveIntensity={2.5}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <coneGeometry args={[0.18, 0.45, 5]} />
            <meshStandardMaterial
              color="#FFCA28"
              emissive="#FFD54F"
              emissiveIntensity={3}
              roughness={0.1}
            />
          </mesh>
        </group>

        {/* Flickering Campfire Light */}
        <pointLight
          ref={fireLightRef}
          position={[0, 0.5, 0]}
          color="#FFA000"
          intensity={2.5}
          distance={9}
          decay={2}
          castShadow
        />

        {/* Embers particles */}
        <points ref={embersRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[emberPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.065}
            color="#FFD54F"
            transparent
            opacity={0.85}
          />
        </points>

        {/* Log bench for travelers to sit on */}
        <mesh position={[0, 0.2, 1.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 1.6, 7]} />
          <meshStandardMaterial color="#4A3425" roughness={0.9} />
        </mesh>
      </group>

      {/* ─── EXPEDITION TENT ─── */}
      <group position={[-3.2, 0, -0.6]} rotation={[0, 0.4, 0]}>
        {/* A-frame tent canvas */}
        <mesh position={[0, 0.65, 0]} castShadow>
          <coneGeometry args={[1.2, 1.3, 4]} />
          <meshStandardMaterial color="#0D5C63" roughness={0.7} flatShading />
        </mesh>
        {/* Tent door glow */}
        <mesh position={[0.4, 0.4, 0.6]} rotation={[0, 0.4, 0]}>
          <planeGeometry args={[0.5, 0.7]} />
          <meshBasicMaterial color="#FEF08A" />
        </mesh>
        {/* Warm lantern hanging outside */}
        <pointLight position={[0.6, 0.8, 0.8]} color="#FBBF24" intensity={1.2} distance={4} />
      </group>

      {/* ─── SAFARNAMMA JEEP (Parked at Camp with Boy and Girl) ─── */}
      <group position={[2.2, 0.02, 0.4]} rotation={[0, -0.6, 0]}>
        <SafarJeep
          position={[0, 0, 0]}
          scrollVelocity={0}
          tiltX={0}
          headlightsOn={true}
          scale={0.95}
        />
      </group>

      {/* ─── SURROUNDING PINE TREES ─── */}
      {[
        { pos: [-4.6, 0, -2.5], s: 1.2 },
        { pos: [-2.0, 0, -3.8], s: 1.0 },
        { pos: [0.5, 0, -4.2], s: 1.15 },
        { pos: [3.5, 0, -3.2], s: 0.9 },
        { pos: [4.8, 0, -1.2], s: 1.1 },
        { pos: [4.2, 0, 1.8], s: 0.85 },
      ].map((tree, idx) => (
        <group key={`camp-tree-${idx}`} position={tree.pos as [number, number, number]} scale={tree.s}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 1.2, 6]} />
            <meshStandardMaterial color="#2B1810" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.6, 0]} castShadow>
            <coneGeometry args={[0.75, 1.3, 6]} />
            <meshStandardMaterial color="#143628" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 2.3, 0]} castShadow>
            <coneGeometry args={[0.55, 1.1, 6]} />
            <meshStandardMaterial color="#1A4736" roughness={0.8} flatShading />
          </mesh>
        </group>
      ))}

      {/* ─── STARRY SKY PARTICLES ─── */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.07} color="#E2E8F0" transparent opacity={0.9} />
      </points>
    </group>
  );
};
