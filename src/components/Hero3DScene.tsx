import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Stars, Trail, OrbitControls, Sparkles } from '@react-three/drei';
import { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';

// Massive glowing central node with energy pulses
const CentralNode = () => {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (coreRef.current) {
      coreRef.current.rotation.x = t * 0.3;
      coreRef.current.rotation.y = t * 0.5;
      const scale = 1 + Math.sin(t * 2) * 0.1;
      coreRef.current.scale.setScalar(scale);
    }
    if (innerRef.current) {
      innerRef.current.rotation.y = t * 0.8;
      innerRef.current.rotation.z = t * 0.3;
    }
    if (outerRef.current) {
      const pulse = 1.5 + Math.sin(t * 3) * 0.3;
      outerRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Inner wireframe */}
      <mesh ref={innerRef}>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={2}
          wireframe
        />
      </mesh>

      {/* Main core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.2, 2]} />
        <MeshDistortMaterial
          color="#10b981"
          emissive="#22c55e"
          emissiveIntensity={0.8}
          distort={0.4}
          speed={5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Outer glow */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

// Orbiting rings
const OrbitRings = () => {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring1.current) {
      ring1.current.rotation.x = Math.PI / 2;
      ring1.current.rotation.z = t * 0.3;
    }
    if (ring2.current) {
      ring2.current.rotation.x = Math.PI / 3;
      ring2.current.rotation.z = -t * 0.2;
    }
    if (ring3.current) {
      ring3.current.rotation.x = Math.PI / 2.5;
      ring3.current.rotation.y = t * 0.15;
    }
  });

  return (
    <>
      <mesh ref={ring1}>
        <torusGeometry args={[2.5, 0.03, 16, 100]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[3.2, 0.02, 16, 100]} />
        <meshStandardMaterial color="#14b8a6" emissive="#14b8a6" emissiveIntensity={0.8} />
      </mesh>
      <mesh ref={ring3}>
        <torusGeometry args={[4, 0.02, 16, 100]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.6} />
      </mesh>
    </>
  );
};

// Orbiting satellite with trail
const Satellite = ({ radius, speed, color, startAngle = 0, tilt = 0 }: {
  radius: number;
  speed: number;
  color: string;
  startAngle?: number;
  tilt?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + startAngle;
    if (meshRef.current) {
      meshRef.current.position.x = Math.cos(t) * radius;
      meshRef.current.position.z = Math.sin(t) * radius;
      meshRef.current.position.y = Math.sin(t * 2) * 0.5;
      meshRef.current.rotation.x = t * 2;
      meshRef.current.rotation.y = t * 3;
    }
  });

  return (
    <group rotation={[tilt, 0, 0]}>
      <Trail width={0.4} length={5} color={color} attenuation={(t) => t * t}>
        <mesh ref={meshRef}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} metalness={0.9} roughness={0.1} />
        </mesh>
      </Trail>
    </group>
  );
};

// Floating crystal shards
const Crystals = () => {
  const crystals = useMemo(() => {
    return Array.from({ length: 15 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 12,
      ] as [number, number, number],
      scale: 0.1 + Math.random() * 0.2,
      speed: 0.5 + Math.random() * 1,
    }));
  }, []);

  return (
    <>
      {crystals.map((crystal, i) => (
        <Float key={i} speed={crystal.speed} rotationIntensity={1} floatIntensity={2}>
          <mesh position={crystal.position} scale={crystal.scale}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#22c55e' : '#14b8a6'}
              emissive={i % 2 === 0 ? '#22c55e' : '#14b8a6'}
              emissiveIntensity={0.5}
              metalness={0.9}
              roughness={0.1}
              transparent
              opacity={0.7}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
};

// Spiral particle storm
const ParticleStorm = () => {
  const points = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const count = 400;
    const pos = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 6;
      const radius = 3 + (i / count) * 6;
      const y = (Math.random() - 0.5) * 8;
      
      pos[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5);
    }
    
    return pos;
  }, []);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={400} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#22c55e" transparent opacity={0.7} sizeAttenuation />
    </points>
  );
};

// Energy beams
const EnergyBeams = () => {
  const beamsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (beamsRef.current) {
      beamsRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <group ref={beamsRef}>
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5]} rotation={[0, 0, angle + Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.06, 3, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} transparent opacity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
};

// Camera controller
const CameraController = () => {
  const { camera, mouse } = useThree();
  
  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 1.5, 0.02);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.y * 0.8 + 1, 0.02);
    camera.lookAt(0, 0, 0);
  });

  return null;
};

// Main Scene
export const Hero3DScene = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 1, 9], fov: 55 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#22c55e" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#14b8a6" />
          <pointLight position={[0, 0, 0]} intensity={3} color="#22c55e" distance={5} />

          <CentralNode />
          <OrbitRings />
          <EnergyBeams />

          <Satellite radius={3} speed={0.5} color="#22c55e" startAngle={0} tilt={0.2} />
          <Satellite radius={4} speed={0.35} color="#14b8a6" startAngle={Math.PI} tilt={-0.3} />
          <Satellite radius={5} speed={0.25} color="#10b981" startAngle={Math.PI / 2} tilt={0.4} />

          <Crystals />
          <ParticleStorm />
          
          <Sparkles count={80} size={2} scale={[15, 15, 15]} color="#22c55e" speed={0.4} />
          <Stars radius={60} depth={50} count={1500} factor={4} saturation={0} fade speed={1} />

          <CameraController />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3} />
        </Suspense>
      </Canvas>
    </div>
  );
};
