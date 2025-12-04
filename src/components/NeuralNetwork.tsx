import { useRef, useMemo, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { agents, divisionColors, Division } from '@/lib/agents-data';

const Node = ({ position, color, scale = 0.15 }: { position: [number, number, number]; color: string; scale?: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale + Math.sin(state.clock.getElapsedTime() * 2) * 0.02);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[scale, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
};

const ConnectionLine = ({ start, end, color }: { start: THREE.Vector3; end: THREE.Vector3; color: string }) => {
  const lineRef = useRef<THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>>(null);

  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    return geometry;
  }, [start, end]);

  useFrame((state) => {
    if (lineRef.current && lineRef.current.material) {
      lineRef.current.material.opacity = 0.3 + Math.sin(state.clock.getElapsedTime() * 3) * 0.2;
    }
  });

  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }))} ref={lineRef} />
  );
};

const NetworkVisualization = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  // Create node positions in a spherical pattern
  const nodes = useMemo(() => {
    return agents.map((agent, i) => {
      const phi = Math.acos(-1 + (2 * i) / agents.length);
      const theta = Math.sqrt(agents.length * Math.PI) * phi;
      const radius = 3;
      return {
        position: [
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi),
        ] as [number, number, number],
        color: divisionColors[agent.division as Division],
        agent,
      };
    });
  }, []);

  // Create connections between nodes in the same division
  const connections = useMemo(() => {
    const conns: { start: THREE.Vector3; end: THREE.Vector3; color: string }[] = [];
    
    nodes.forEach((node, i) => {
      // Connect to next 2 nodes in same division
      nodes.slice(i + 1).forEach((otherNode) => {
        if (node.agent.division === otherNode.agent.division) {
          conns.push({
            start: new THREE.Vector3(...node.position),
            end: new THREE.Vector3(...otherNode.position),
            color: node.color,
          });
        }
      });
      
      // Random connections between divisions
      if (i % 3 === 0 && i + 5 < nodes.length) {
        conns.push({
          start: new THREE.Vector3(...node.position),
          end: new THREE.Vector3(...nodes[i + 5].position),
          color: '#00FFE0',
        });
      }
    });
    
    return conns;
  }, [nodes]);

  // Center node (Director)
  const centerNode = {
    position: [0, 0, 0] as [number, number, number],
    color: '#00E5A0',
  };

  return (
    <group ref={groupRef}>
      {/* Center Director node */}
      <Node position={centerNode.position} color={centerNode.color} scale={0.3} />
      
      {/* Agent nodes */}
      {nodes.map((node, i) => (
        <Node key={i} position={node.position} color={node.color} />
      ))}
      
      {/* Connections */}
      {connections.map((conn, i) => (
        <ConnectionLine key={i} {...conn} />
      ))}
      
      {/* Connections to center */}
      {nodes.filter((_, i) => i % 4 === 0).map((node, i) => (
        <ConnectionLine
          key={`center-${i}`}
          start={new THREE.Vector3(0, 0, 0)}
          end={new THREE.Vector3(...node.position)}
          color="#00E5A0"
        />
      ))}
    </group>
  );
};

export const NeuralNetwork = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 matrix-bg opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-cyber text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">NEURAL COMMUNICATION NETWORK</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real-time visualization of agent-to-agent data flow. Each node represents an AI agent, 
            connections show active communication channels.
          </p>
        </motion.div>

        {/* 3D Canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative h-[500px] rounded-2xl overflow-hidden border border-border bg-card/50 shadow-cyber-lg"
        >
          {/* Glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px]" />
          
          <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#00FFE0" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" />
            <Suspense fallback={null}>
              <NetworkVisualization />
            </Suspense>
            <OrbitControls 
              enableZoom={true} 
              enablePan={false} 
              minDistance={5} 
              maxDistance={15}
              autoRotate
              autoRotateSpeed={0.5}
            />
          </Canvas>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 p-4 rounded-xl glass-morphism border border-border/50">
            <h4 className="font-mono text-xs text-muted-foreground mb-2">DIVISIONS</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(divisionColors).slice(0, 4).map(([division, color]) => (
                <div key={division} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-muted-foreground capitalize">
                    {division.split('-')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-4 right-4 p-4 rounded-xl glass-morphism border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="font-mono text-xs text-primary">LIVE</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Active Connections:</span>
                <span className="text-foreground font-mono">142</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Data Packets/sec:</span>
                <span className="text-foreground font-mono">2.4K</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Latency:</span>
                <span className="text-green-500 font-mono">12ms</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
