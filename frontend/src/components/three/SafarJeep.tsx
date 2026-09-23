import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SafarJeepProps {
  /** Scroll velocity for wheel spin speed */
  scrollVelocity?: number;
  /** Mouse X tilt (-1 to 1) for suspension banking */
  tiltX?: number;
  /** Whether headlights are on */
  headlightsOn?: boolean;
  /** Position override */
  position?: [number, number, number];
  /** Rotation override */
  rotation?: [number, number, number];
  /** Scale override */
  scale?: number;
}

// ─── Color Palette (from SafarNamma logo) ───────────────────────
const COLORS = {
  body: '#0D5C63',         // Petrol Teal — the Jeep body
  bodyDark: '#0A3F47',     // Darker teal for underside
  grille: '#1A1A1A',       // Dark charcoal grille
  headlight: '#F59E0B',    // Golden Amber headlights
  headlightGlow: '#FDE68A',
  tire: '#2C2C2C',         // Near-black tires
  rim: '#C0C0C0',          // Silver wheel rims
  windshield: '#87CEEB',   // Light blue glass
  rollCage: '#333333',     // Dark roll cage bars
  seat: '#1A1A1A',         // Black seats
  steering: '#333333',     // Steering wheel
  skinBoy: '#D4A574',      // Boy's skin tone
  skinGirl: '#C68B5E',     // Girl's skin tone
  hairBoy: '#2C1810',      // Dark brown hair
  hairGirl: '#1A0F0A',     // Black hair
  shirtBoy: '#0D5C63',     // Teal shirt (matches Jeep)
  shirtGirl: '#14B8A6',    // Lighter teal
  sunglasses: '#111111',   // Black shades
  spare: '#2C2C2C',        // Spare tire
};

/**
 * Procedural low-poly 3D Open-Top Jeep with Boy (driver) & Girl (passenger).
 * Built entirely with Three.js primitives — no external 3D model files needed.
 * 
 * Features:
 * - Petrol Teal body matching the SafarNamma logo
 * - 7-slot front grille, round amber headlights with glow
 * - Open-top cabin with roll cage
 * - 4 chunky off-road tires + rear-mounted spare
 * - Boy driver (left hand on steering wheel, sunglasses)
 * - Girl passenger (hair flowing back, arm on door, sunglasses)
 * - Suspension tilt from mouse cursor
 * - Wheel spin from scroll velocity
 */
export const SafarJeep: React.FC<SafarJeepProps> = ({
  scrollVelocity = 0,
  tiltX = 0,
  headlightsOn = true,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const wheelFLRef = useRef<THREE.Group>(null);
  const wheelFRRef = useRef<THREE.Group>(null);
  const wheelRLRef = useRef<THREE.Group>(null);
  const wheelRRRef = useRef<THREE.Group>(null);
  const suspensionRef = useRef<THREE.Group>(null);
  const girlHairRef = useRef<THREE.Mesh>(null);

  // Smooth suspension tilt
  const currentTilt = useRef(0);

  useFrame((_, delta) => {
    // Smooth suspension banking
    const targetTilt = tiltX * 0.15; // Max 15 degrees
    currentTilt.current += (targetTilt - currentTilt.current) * 3 * delta;
    if (suspensionRef.current) {
      suspensionRef.current.rotation.z = currentTilt.current;
      // Slight vertical bounce
      suspensionRef.current.position.y = Math.sin(Date.now() * 0.003) * 0.02;
    }

    // Spin wheels based on scroll velocity
    const spinSpeed = scrollVelocity * 15 * delta;
    [wheelFLRef, wheelFRRef, wheelRLRef, wheelRRRef].forEach(ref => {
      if (ref.current) {
        ref.current.rotation.x -= spinSpeed;
      }
    });

    // Girl's hair flowing animation
    if (girlHairRef.current) {
      girlHairRef.current.rotation.x = Math.sin(Date.now() * 0.002) * 0.05 - 0.2;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <group ref={suspensionRef}>
        {/* ═══ JEEP BODY ═══ */}
        <JeepBody headlightsOn={headlightsOn} />

        {/* ═══ CHARACTERS ═══ */}
        <DriverBoy />
        <PassengerGirl hairRef={girlHairRef} />

        {/* ═══ WHEELS ═══ */}
        <Wheel ref={wheelFLRef} position={[-0.85, -0.35, 1.15]} />
        <Wheel ref={wheelFRRef} position={[0.85, -0.35, 1.15]} />
        <Wheel ref={wheelRLRef} position={[-0.85, -0.35, -1.1]} />
        <Wheel ref={wheelRRRef} position={[0.85, -0.35, -1.1]} />

        {/* ═══ SPARE TIRE (rear-mounted) ═══ */}
        <SpareTire />
      </group>
    </group>
  );
};

// ─── JEEP BODY ────────────────────────────────────────────────────
const JeepBody: React.FC<{ headlightsOn: boolean }> = ({ headlightsOn }) => {
  return (
    <group>
      {/* Main body block */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.6, 3.2]} />
        <meshStandardMaterial color={COLORS.body} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Hood (front, slightly raised) */}
      <mesh position={[0, 0.5, 1.2]} castShadow>
        <boxGeometry args={[1.7, 0.15, 1.0]} />
        <meshStandardMaterial color={COLORS.body} roughness={0.35} metalness={0.15} />
      </mesh>

      {/* Undercarriage */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[1.6, 0.15, 3.0]} />
        <meshStandardMaterial color={COLORS.bodyDark} roughness={0.8} />
      </mesh>

      {/* Front bumper */}
      <mesh position={[0, -0.05, 1.7]} castShadow>
        <boxGeometry args={[1.9, 0.25, 0.15]} />
        <meshStandardMaterial color={COLORS.grille} roughness={0.6} metalness={0.3} />
      </mesh>

      {/* ─── 7-SLOT GRILLE ─── */}
      <Grille />

      {/* ─── HEADLIGHTS ─── */}
      <Headlight position={[-0.65, 0.35, 1.72]} on={headlightsOn} />
      <Headlight position={[0.65, 0.35, 1.72]} on={headlightsOn} />

      {/* Windshield frame (A-pillars) */}
      <mesh position={[-0.85, 0.95, 0.65]}>
        <boxGeometry args={[0.06, 0.7, 0.06]} />
        <meshStandardMaterial color={COLORS.rollCage} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0.85, 0.95, 0.65]}>
        <boxGeometry args={[0.06, 0.7, 0.06]} />
        <meshStandardMaterial color={COLORS.rollCage} roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Windshield glass */}
      <mesh position={[0, 0.9, 0.65]} rotation={[-0.15, 0, 0]}>
        <planeGeometry args={[1.64, 0.65]} />
        <meshStandardMaterial
          color={COLORS.windshield}
          transparent
          opacity={0.35}
          roughness={0.05}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ─── ROLL CAGE ─── */}
      <RollCage />

      {/* ─── SIDE PANELS (door outlines) ─── */}
      {/* Left door */}
      <mesh position={[-0.91, 0.3, -0.1]} castShadow>
        <boxGeometry args={[0.05, 0.55, 1.4]} />
        <meshStandardMaterial color={COLORS.body} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Right door */}
      <mesh position={[0.91, 0.3, -0.1]} castShadow>
        <boxGeometry args={[0.05, 0.55, 1.4]} />
        <meshStandardMaterial color={COLORS.body} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Rear panel */}
      <mesh position={[0, 0.35, -1.58]} castShadow>
        <boxGeometry args={[1.8, 0.85, 0.08]} />
        <meshStandardMaterial color={COLORS.body} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* ─── SEATS ─── */}
      {/* Driver seat */}
      <mesh position={[-0.4, 0.2, -0.15]}>
        <boxGeometry args={[0.55, 0.12, 0.5]} />
        <meshStandardMaterial color={COLORS.seat} roughness={0.9} />
      </mesh>
      <mesh position={[-0.4, 0.5, -0.38]}>
        <boxGeometry args={[0.55, 0.5, 0.1]} />
        <meshStandardMaterial color={COLORS.seat} roughness={0.9} />
      </mesh>
      {/* Passenger seat */}
      <mesh position={[0.4, 0.2, -0.15]}>
        <boxGeometry args={[0.55, 0.12, 0.5]} />
        <meshStandardMaterial color={COLORS.seat} roughness={0.9} />
      </mesh>
      <mesh position={[0.4, 0.5, -0.38]}>
        <boxGeometry args={[0.55, 0.5, 0.1]} />
        <meshStandardMaterial color={COLORS.seat} roughness={0.9} />
      </mesh>

      {/* Steering wheel */}
      <mesh position={[-0.4, 0.7, 0.4]} rotation={[-0.5, 0, 0]}>
        <torusGeometry args={[0.14, 0.02, 8, 16]} />
        <meshStandardMaterial color={COLORS.steering} roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Steering column */}
      <mesh position={[-0.4, 0.55, 0.48]} rotation={[-0.5, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
        <meshStandardMaterial color={COLORS.steering} roughness={0.6} metalness={0.3} />
      </mesh>
    </group>
  );
};

// ─── 7-SLOT GRILLE ────────────────────────────────────────────────
const Grille: React.FC = () => {
  const slots = 7;
  const slotWidth = 0.12;
  const gap = 0.04;
  const totalWidth = slots * slotWidth + (slots - 1) * gap;
  const startX = -totalWidth / 2 + slotWidth / 2;

  return (
    <group position={[0, 0.35, 1.73]}>
      {Array.from({ length: slots }).map((_, i) => (
        <mesh key={i} position={[startX + i * (slotWidth + gap), 0, 0]}>
          <boxGeometry args={[slotWidth, 0.25, 0.05]} />
          <meshStandardMaterial color={COLORS.grille} roughness={0.7} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
};

// ─── HEADLIGHT ────────────────────────────────────────────────────
const Headlight: React.FC<{ position: [number, number, number]; on: boolean }> = ({ position, on }) => {
  return (
    <group position={position}>
      {/* Housing */}
      <mesh>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 16]} />
        <meshStandardMaterial color="#444444" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Lens */}
      <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial
          color={on ? COLORS.headlight : '#666666'}
          emissive={on ? COLORS.headlight : '#000000'}
          emissiveIntensity={on ? 2.5 : 0}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>
      {/* Point light (only if on) */}
      {on && (
        <pointLight
          color={COLORS.headlightGlow}
          intensity={3}
          distance={12}
          decay={2}
          position={[0, 0, 0.5]}
        />
      )}
    </group>
  );
};

// ─── ROLL CAGE ────────────────────────────────────────────────────
const RollCage: React.FC = () => {
  const barMaterial = useMemo(() => (
    <meshStandardMaterial color={COLORS.rollCage} roughness={0.5} metalness={0.4} />
  ), []);

  return (
    <group>
      {/* B-pillars (rear uprights) */}
      <mesh position={[-0.85, 0.95, -0.75]}>
        <boxGeometry args={[0.06, 0.7, 0.06]} />
        {barMaterial}
      </mesh>
      <mesh position={[0.85, 0.95, -0.75]}>
        <boxGeometry args={[0.06, 0.7, 0.06]} />
        {barMaterial}
      </mesh>

      {/* Top bars connecting A to B pillars (roof rails) */}
      <mesh position={[-0.85, 1.28, -0.05]}>
        <boxGeometry args={[0.05, 0.05, 1.45]} />
        {barMaterial}
      </mesh>
      <mesh position={[0.85, 1.28, -0.05]}>
        <boxGeometry args={[0.05, 0.05, 1.45]} />
        {barMaterial}
      </mesh>

      {/* Cross bar (front) */}
      <mesh position={[0, 1.28, 0.65]}>
        <boxGeometry args={[1.75, 0.05, 0.05]} />
        {barMaterial}
      </mesh>

      {/* Cross bar (rear) */}
      <mesh position={[0, 1.28, -0.75]}>
        <boxGeometry args={[1.75, 0.05, 0.05]} />
        {barMaterial}
      </mesh>
    </group>
  );
};

// ─── WHEEL ────────────────────────────────────────────────────────
const Wheel = React.forwardRef<THREE.Group, { position: [number, number, number] }>(
  ({ position }, ref) => {
    return (
      <group ref={ref} position={position}>
        {/* Tire */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.22, 16]} />
          <meshStandardMaterial color={COLORS.tire} roughness={0.95} />
        </mesh>
        {/* Rim */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.24, 8]} />
          <meshStandardMaterial color={COLORS.rim} roughness={0.2} metalness={0.7} />
        </mesh>
        {/* Hub cap */}
        <mesh position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 8]} />
          <meshStandardMaterial color="#888888" roughness={0.2} metalness={0.8} />
        </mesh>
      </group>
    );
  }
);

Wheel.displayName = 'Wheel';

// ─── SPARE TIRE (rear-mounted) ────────────────────────────────────
const SpareTire: React.FC = () => {
  return (
    <group position={[0, 0.35, -1.7]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Tire */}
      <mesh>
        <torusGeometry args={[0.22, 0.1, 8, 16]} />
        <meshStandardMaterial color={COLORS.spare} roughness={0.95} />
      </mesh>
      {/* Mount bracket */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color={COLORS.rollCage} roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
};

// ─── DRIVER BOY ───────────────────────────────────────────────────
const DriverBoy: React.FC = () => {
  return (
    <group position={[-0.4, 0.55, -0.1]}>
      {/* Torso */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.35, 0.4, 0.25]} />
        <meshStandardMaterial color={COLORS.shirtBoy} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.6, 0.02]} castShadow>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color={COLORS.skinBoy} roughness={0.8} />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 0.7, -0.02]}>
        <sphereGeometry args={[0.13, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={COLORS.hairBoy} roughness={0.9} />
      </mesh>

      {/* Sunglasses */}
      <mesh position={[0, 0.6, 0.14]}>
        <boxGeometry args={[0.22, 0.06, 0.02]} />
        <meshStandardMaterial color={COLORS.sunglasses} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Left arm (on steering wheel) */}
      <mesh position={[-0.02, 0.25, 0.25]} rotation={[-0.8, 0, 0.2]}>
        <boxGeometry args={[0.08, 0.28, 0.08]} />
        <meshStandardMaterial color={COLORS.skinBoy} roughness={0.8} />
      </mesh>

      {/* Right arm (resting on door) */}
      <mesh position={[0.22, 0.22, 0]} rotation={[0, 0, -0.6]}>
        <boxGeometry args={[0.08, 0.28, 0.08]} />
        <meshStandardMaterial color={COLORS.skinBoy} roughness={0.8} />
      </mesh>
    </group>
  );
};

// ─── PASSENGER GIRL ───────────────────────────────────────────────
const PassengerGirl: React.FC<{ hairRef: React.RefObject<THREE.Mesh | null> }> = ({ hairRef }) => {
  return (
    <group position={[0.4, 0.55, -0.1]}>
      {/* Torso */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.32, 0.38, 0.22]} />
        <meshStandardMaterial color={COLORS.shirtGirl} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.6, 0.02]} castShadow>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color={COLORS.skinGirl} roughness={0.8} />
      </mesh>

      {/* Long flowing hair */}
      <mesh ref={hairRef} position={[0, 0.55, -0.12]}>
        <boxGeometry args={[0.24, 0.35, 0.15]} />
        <meshStandardMaterial color={COLORS.hairGirl} roughness={0.9} />
      </mesh>
      {/* Hair top */}
      <mesh position={[0, 0.7, -0.02]}>
        <sphereGeometry args={[0.12, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={COLORS.hairGirl} roughness={0.9} />
      </mesh>

      {/* Sunglasses */}
      <mesh position={[0, 0.6, 0.13]}>
        <boxGeometry args={[0.2, 0.055, 0.02]} />
        <meshStandardMaterial color={COLORS.sunglasses} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Right arm (resting on door edge) */}
      <mesh position={[0.2, 0.22, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.07, 0.26, 0.07]} />
        <meshStandardMaterial color={COLORS.skinGirl} roughness={0.8} />
      </mesh>

      {/* Left arm (relaxed in lap) */}
      <mesh position={[-0.12, 0.15, 0.08]} rotation={[-0.3, 0, 0.3]}>
        <boxGeometry args={[0.07, 0.22, 0.07]} />
        <meshStandardMaterial color={COLORS.skinGirl} roughness={0.8} />
      </mesh>
    </group>
  );
};
