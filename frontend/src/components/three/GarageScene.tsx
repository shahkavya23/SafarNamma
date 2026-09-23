import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SafarJeep } from './SafarJeep';

interface GarageSceneProps {
  autoRotate?: boolean;
  headlightsOn?: boolean;
  mousePos?: { x: number; y: number };
}

export const GarageScene: React.FC<GarageSceneProps> = ({
  autoRotate = true,
  headlightsOn = true,
  mousePos = { x: 0, y: 0 },
}) => {
  const turntableRef = useRef<THREE.Group>(null);
  const spotlightRef = useRef<THREE.SpotLight>(null);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();

    // Turntable slow rotation
    if (turntableRef.current && autoRotate) {
      turntableRef.current.rotation.y = t * 0.25;
    }

    // Camera subtle breathing/mouse parallax
    const targetCamX = mousePos.x * 0.8;
    const targetCamY = 2.4 + mousePos.y * 0.4;
    camera.position.x += (targetCamX - camera.position.x) * 0.05;
    camera.position.y += (targetCamY - camera.position.y) * 0.05;
    camera.lookAt(0, 0.7, 0);
  });

  return (
    <group>
      {/* ─── SHOWROOM LIGHTING ─── */}
      <ambientLight intensity={0.4} color="#E2E8F0" />

      {/* Overhead dramatic vehicle spotlight */}
      <spotLight
        ref={spotlightRef}
        position={[0, 6.5, 0]}
        intensity={2.8}
        angle={0.65}
        penumbra={0.8}
        color="#FFFBEB"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Warm Teal Rim Light */}
      <directionalLight position={[-4, 3, -3]} intensity={1.2} color="#0D5C63" />

      {/* Amber Warm Fill Light */}
      <directionalLight position={[4, 3, 3]} intensity={1.4} color="#F59E0B" />

      {/* ─── GARAGE FLOOR & PAVILION ─── */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[7, 8, 1.2, 24]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>

      {/* Dark polished concrete workshop pad */}
      <mesh position={[0, 0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 6, 32]} />
        <meshStandardMaterial color="#0F172A" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* ─── ROTATING TURNTABLE ─── */}
      <group ref={turntableRef} position={[0, 0.05, 0]}>
        {/* Turntable Disc */}
        <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[2.5, 2.6, 0.12, 32]} />
          <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.5} />
        </mesh>

        {/* Circular Accent Plate (Amber ring) */}
        <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 2.38, 32]} />
          <meshStandardMaterial
            color="#F59E0B"
            emissive="#F59E0B"
            emissiveIntensity={1.2}
            roughness={0.3}
          />
        </mesh>

        {/* Inner wood plank deck */}
        <mesh position={[0, 0.122, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.15, 32]} />
          <meshStandardMaterial color="#1E293B" roughness={0.8} />
        </mesh>

        {/* ─── THE SAFARNAMMA JEEP ON TURNTABLE ─── */}
        <group position={[0, 0.12, 0]}>
          <SafarJeep
            position={[0, 0, 0]}
            scrollVelocity={0}
            tiltX={0}
            headlightsOn={headlightsOn}
            scale={1}
          />
        </group>
      </group>

      {/* ─── WORKSHOP GEAR & ACCESSORIES (Static, outside turntable) ─── */}
      {/* Spare Tires Stack */}
      <group position={[-3.2, 0, -1.2]}>
        {[0, 0.3, 0.6].map((y, i) => (
          <mesh key={i} position={[0, y + 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.28, 14]} />
            <meshStandardMaterial color="#18181B" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Tool Cabinet / Workbench */}
      <group position={[3.2, 0, -1.5]} rotation={[0, -0.4, 0]}>
        {/* Cabinet Body */}
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[1.2, 1.3, 0.6]} />
          <meshStandardMaterial color="#0D5C63" roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Drawers */}
        {[-0.2, 0.15, 0.5].map((y, idx) => (
          <mesh key={idx} position={[0, y, 0.31]}>
            <boxGeometry args={[1.0, 0.28, 0.02]} />
            <meshStandardMaterial color="#0A3F47" roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Expedition Jerry Cans (Teal & Amber) */}
      <group position={[-2.8, 0, 1.8]} rotation={[0, 0.3, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.22, 0.6, 0.35]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.5} />
        </mesh>
        <mesh position={[0.3, 0.3, 0.05]} castShadow>
          <boxGeometry args={[0.22, 0.6, 0.35]} />
          <meshStandardMaterial color="#0D5C63" roughness={0.5} />
        </mesh>
      </group>

      {/* Ceiling Beam with hanging light bulb */}
      <mesh position={[0, 4.5, 0]}>
        <boxGeometry args={[8, 0.25, 0.25]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>
      <mesh position={[0, 3.8, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.4, 6]} />
        <meshStandardMaterial color="#64748B" />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#FEF08A" emissive="#FEF08A" emissiveIntensity={3} />
      </mesh>
    </group>
  );
};
