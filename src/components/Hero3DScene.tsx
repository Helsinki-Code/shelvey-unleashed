import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Environment, Stars, Trail, OrbitControls } from '@react-three/drei';
import { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';

// Animated floating sphere with glow
const GlowingSphere = ({ position, color, size = 1, speed = 1 }: { 
  position: [number, number, number]; 
  color: string; 
  size?: number;
  speed?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 * speed;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
};

// Central core with pulsing effect
const CentralCore = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
    if (glowRef.current) {
      const glowScale = 1.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
      glowRef.current.scale.setScalar(glowScale);
    }
  });

  return (
    <group>
      {/* Inner core */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.2, 4]} />
        <MeshDistortMaterial
          color="#22c55e"
          attach="material"
          distort={0.3}
          speed={3}
          roughness={0.1}
          metalness={0.9}
          emissive="#22c55e"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.1}
        />
      </mesh>
    </group>
  );
};

// Orbiting rings
const OrbitRing = ({ radius, speed, color }: { radius: number; speed: number; color: string }) => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * speed;
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[radius, 0.02, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
};

// Floating particles system
const ParticleField = ({ count = 200 }: { count?: number }) => {
  const points = useRef<THREE.Points>(null);
  
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 10;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.05;
      points.current.rotation.x = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#22c55e"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

// Connection lines between spheres
const ConnectionLines = () => {
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const positions = useMemo(() => {
    const points: number[] = [];
    const spherePositions = [
      [-3, 2, -2],
      [3, -1, -3],
      [-2, -2, 2],
      [2.5, 1.5, 1],
      [-1.5, 3, -1],
      [1, -3, 2],
    ];
    
    // Connect to center
    spherePositions.forEach(pos => {
      points.push(0, 0, 0);
      points.push(pos[0] * 0.5, pos[1] * 0.5, pos[2] * 0.5);
    });
    
    return new Float32Array(points);
  }, []);

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#22c55e" transparent opacity={0.3} />
    </lineSegments>
  );
};

// Mouse-following camera effect
const CameraController = () => {
  const { camera } = useThree();
  
  useFrame((state) => {
    // Subtle camera movement based on time
    camera.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.5;
    camera.position.y = Math.cos(state.clock.elapsedTime * 0.15) * 0.3;
    camera.lookAt(0, 0, 0);
  });

  return null;
};

// Main 3D Scene
export const Hero3DScene = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#22c55e" />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#14b8a6" />
          <spotLight
            position={[0, 10, 0]}
            angle={0.3}
            penumbra={1}
            intensity={1}
            color="#22c55e"
          />

          {/* Central core */}
          <CentralCore />

          {/* Orbiting rings */}
          <OrbitRing radius={2.5} speed={0.3} color="#22c55e" />
          <OrbitRing radius={3.2} speed={-0.2} color="#14b8a6" />
          <OrbitRing radius={4} speed={0.15} color="#22c55e" />

          {/* Floating spheres */}
          <GlowingSphere position={[-3, 2, -2]} color="#22c55e" size={0.4} speed={1.2} />
          <GlowingSphere position={[3, -1, -3]} color="#14b8a6" size={0.5} speed={0.8} />
          <GlowingSphere position={[-2, -2, 2]} color="#10b981" size={0.35} speed={1} />
          <GlowingSphere position={[2.5, 1.5, 1]} color="#22c55e" size={0.45} speed={0.9} />
          <GlowingSphere position={[-1.5, 3, -1]} color="#059669" size={0.3} speed={1.1} />
          <GlowingSphere position={[1, -3, 2]} color="#14b8a6" size={0.4} speed={1.3} />

          {/* Connection lines */}
          <ConnectionLines />

          {/* Particle field */}
          <ParticleField count={300} />

          {/* Stars background */}
          <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />

          {/* Camera animation */}
          <CameraController />

          {/* Allow user interaction */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
