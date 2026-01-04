
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// @ts-ignore - Define intrinsic elements as variables to avoid JSX type errors
const Group = 'group' as any;
const Points = 'points' as any;
const BufferGeometry = 'bufferGeometry' as any;
const BufferAttribute = 'bufferAttribute' as any;
const PointsMaterial = 'pointsMaterial' as any;
const Mesh = 'mesh' as any;
const SphereGeometry = 'sphereGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;

const ParticleSphere = ({ color, isActive }: { color: string, isActive: boolean }) => {
  const pointsRef = useRef<THREE.Points>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  
  const spherePositions = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.5 + Math.random() * 0.2;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Calculate pulse based on active state
    // Faster, larger pulse when speaking (isActive), subtle breathing when idle
    const pulseFreq = isActive ? 12 : 2;
    const pulseAmp = isActive ? 0.08 : 0.02;
    const scale = 1 + Math.sin(t * pulseFreq) * pulseAmp;

    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.1;
      pointsRef.current.rotation.x = t * 0.05;
      pointsRef.current.scale.set(scale, scale, scale);
    }
    
    if (meshRef.current) {
      meshRef.current.rotation.y = -t * 0.05;
      meshRef.current.rotation.z = t * 0.02;
      meshRef.current.scale.set(scale * 0.95, scale * 0.95, scale * 0.95);
    }
  });

  return (
    <Group>
      <Points ref={pointsRef}>
        <BufferGeometry>
          <BufferAttribute
            attach="attributes-position"
            count={spherePositions.length / 3}
            array={spherePositions}
            itemSize={3}
          />
        </BufferGeometry>
        <PointsMaterial
          transparent
          color={color}
          size={0.03}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
      <Mesh ref={meshRef}>
        <SphereGeometry args={[2.4, 32, 32]} />
        <MeshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.08} 
          wireframe
        />
      </Mesh>
    </Group>
  );
};

const Hologram: React.FC<{ themeColor: string, isSpeaking: boolean }> = ({ themeColor, isSpeaking }) => {
  return (
    <div className="w-full h-full absolute top-0 left-0 pointer-events-none overflow-hidden">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <AmbientLight intensity={0.5} />
        <PointLight position={[10, 10, 10]} intensity={1} />
        <ParticleSphere color={themeColor} isActive={isSpeaking} />
      </Canvas>
    </div>
  );
};

export default Hologram;
