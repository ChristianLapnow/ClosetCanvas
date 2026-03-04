import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// -- Color palette --
const GOLD = "#C9A96E";
const CHAMPAGNE = "#E8D5B7";
const ROSE_GOLD = "#B76E79";
const WARM_WHITE = "#FFF8F0";
const DARK_BG = "#1A1410";

// ---------- Floating Geometric Shape ----------

function FloatingShape({
  geometry,
  position,
  scale,
  rotationSpeed,
  color,
  roughness = 0.2,
  metalness = 0.9,
}: {
  geometry: "torus" | "icosahedron" | "dodecahedron" | "octahedron";
  position: [number, number, number];
  scale: number;
  rotationSpeed: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += rotationSpeed[0] * delta;
      meshRef.current.rotation.y += rotationSpeed[1] * delta;
      meshRef.current.rotation.z += rotationSpeed[2] * delta;
    }
  });

  const geometryNode = useMemo(() => {
    switch (geometry) {
      case "torus":
        return <torusGeometry args={[1, 0.4, 32, 64]} />;
      case "icosahedron":
        return <icosahedronGeometry args={[1, 0]} />;
      case "dodecahedron":
        return <dodecahedronGeometry args={[1, 0]} />;
      case "octahedron":
        return <octahedronGeometry args={[1, 0]} />;
      default:
        return <icosahedronGeometry args={[1, 0]} />;
    }
  }, [geometry]);

  return (
    <Float
      speed={1.2}
      rotationIntensity={0.3}
      floatIntensity={0.8}
      floatingRange={[-0.2, 0.2]}
    >
      <mesh ref={meshRef} position={position} scale={scale}>
        {geometryNode}
        <meshPhysicalMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
          clearcoat={0.4}
          clearcoatRoughness={0.2}
          envMapIntensity={1.5}
          transparent
          opacity={0.85}
        />
      </mesh>
    </Float>
  );
}

// ---------- Flowing Fabric Mesh ----------

const FABRIC_SEGMENTS = 64;

function FlowingFabric() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);

  // Store initial positions for displacement
  const initialPositions = useRef<Float32Array | null>(null);

  useFrame((state) => {
    if (!geometryRef.current) return;

    const positions = geometryRef.current.attributes.position;
    const time = state.clock.elapsedTime;

    // Cache initial positions on first frame
    if (!initialPositions.current) {
      initialPositions.current = new Float32Array(
        positions.array as Float32Array
      );
    }

    const init = initialPositions.current;

    for (let i = 0; i < positions.count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      const x = init[ix];
      const y = init[iy];

      // Layered sine waves for organic silk-like motion
      const wave1 = Math.sin(x * 0.8 + time * 0.4) * 0.3;
      const wave2 = Math.sin(y * 1.2 + time * 0.3) * 0.2;
      const wave3 = Math.sin((x + y) * 0.5 + time * 0.5) * 0.15;
      const wave4 = Math.cos(x * 0.6 - time * 0.2) * Math.sin(y * 0.9 + time * 0.35) * 0.12;

      positions.array[iz] = init[iz] + wave1 + wave2 + wave3 + wave4;
    }

    positions.needsUpdate = true;
    geometryRef.current.computeVertexNormals();

    // Gentle overall rotation
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(time * 0.1) * 0.05;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, -2, -3]}
      rotation={[-Math.PI / 3, 0, Math.PI / 6]}
    >
      <planeGeometry
        ref={geometryRef}
        args={[12, 10, FABRIC_SEGMENTS, FABRIC_SEGMENTS]}
      />
      <meshPhysicalMaterial
        color={GOLD}
        metalness={0.6}
        roughness={0.4}
        clearcoat={0.3}
        clearcoatRoughness={0.4}
        side={THREE.DoubleSide}
        transparent
        opacity={0.25}
        envMapIntensity={1.0}
      />
    </mesh>
  );
}

// ---------- Golden Particle Dust ----------

const PARTICLE_COUNT = 600;

function GoldenParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Spread particles throughout the scene
      pos[i3] = (Math.random() - 0.5) * 20;
      pos[i3 + 1] = (Math.random() - 0.5) * 16;
      pos[i3 + 2] = (Math.random() - 0.5) * 14;

      // Gentle drift velocities
      vel[i3] = (Math.random() - 0.5) * 0.003;
      vel[i3 + 1] = Math.random() * 0.004 + 0.001; // slight upward bias
      vel[i3 + 2] = (Math.random() - 0.5) * 0.002;
    }

    return { positions: pos, velocities: vel };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const positionAttribute = pointsRef.current.geometry.attributes.position;
    const posArray = positionAttribute.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Apply drift velocities with sine modulation for organic movement
      posArray[i3] += velocities[i3] + Math.sin(time * 0.3 + i) * 0.001;
      posArray[i3 + 1] += velocities[i3 + 1] + Math.sin(time * 0.5 + i * 0.7) * 0.001;
      posArray[i3 + 2] += velocities[i3 + 2];

      // Wrap around boundaries seamlessly
      if (posArray[i3] > 10) posArray[i3] = -10;
      if (posArray[i3] < -10) posArray[i3] = 10;
      if (posArray[i3 + 1] > 8) posArray[i3 + 1] = -8;
      if (posArray[i3 + 1] < -8) posArray[i3 + 1] = 8;
      if (posArray[i3 + 2] > 7) posArray[i3 + 2] = -7;
      if (posArray[i3 + 2] < -7) posArray[i3 + 2] = 7;
    }

    positionAttribute.needsUpdate = true;

    // Subtle rotation of entire particle field
    pointsRef.current.rotation.y = time * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <PointMaterial
        transparent
        color={CHAMPAGNE}
        size={0.04}
        sizeAttenuation
        depthWrite={false}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------- Lighting Setup ----------

function LuxuryLighting() {
  return (
    <>
      {/* Warm ambient base */}
      <ambientLight color={WARM_WHITE} intensity={0.3} />

      {/* Key light - warm gold from upper right */}
      <spotLight
        position={[6, 8, 5]}
        angle={0.5}
        penumbra={1}
        intensity={1.2}
        color={GOLD}
        castShadow={false}
      />

      {/* Fill light - soft rose gold from the left */}
      <spotLight
        position={[-5, 4, 3]}
        angle={0.6}
        penumbra={1}
        intensity={0.6}
        color={ROSE_GOLD}
        castShadow={false}
      />

      {/* Rim light - champagne from behind */}
      <pointLight
        position={[0, 3, -6]}
        intensity={0.8}
        color={CHAMPAGNE}
      />

      {/* Subtle lower fill */}
      <pointLight
        position={[0, -5, 2]}
        intensity={0.3}
        color={WARM_WHITE}
      />
    </>
  );
}

// ---------- Scene Content ----------

function SceneContent() {
  return (
    <>
      <LuxuryLighting />

      {/* Floating geometric shapes */}
      <FloatingShape
        geometry="torus"
        position={[-3.5, 2, -2]}
        scale={0.6}
        rotationSpeed={[0.15, 0.2, 0.05]}
        color={GOLD}
        roughness={0.15}
        metalness={0.95}
      />
      <FloatingShape
        geometry="icosahedron"
        position={[3.2, 1.5, -1.5]}
        scale={0.5}
        rotationSpeed={[0.1, 0.15, 0.08]}
        color={CHAMPAGNE}
        roughness={0.25}
        metalness={0.85}
      />
      <FloatingShape
        geometry="dodecahedron"
        position={[-1.5, -1.8, -2.5]}
        scale={0.45}
        rotationSpeed={[0.12, 0.08, 0.1]}
        color={ROSE_GOLD}
        roughness={0.2}
        metalness={0.9}
      />
      <FloatingShape
        geometry="octahedron"
        position={[2, -0.5, -3]}
        scale={0.35}
        rotationSpeed={[0.08, 0.12, 0.15]}
        color={GOLD}
        roughness={0.18}
        metalness={0.92}
      />
      <FloatingShape
        geometry="torus"
        position={[0.5, 3, -4]}
        scale={0.3}
        rotationSpeed={[0.2, 0.1, 0.12]}
        color={CHAMPAGNE}
        roughness={0.22}
        metalness={0.88}
      />
      <FloatingShape
        geometry="icosahedron"
        position={[-3, -0.5, -4.5]}
        scale={0.25}
        rotationSpeed={[0.18, 0.14, 0.06]}
        color={ROSE_GOLD}
        roughness={0.3}
        metalness={0.8}
      />

      {/* Flowing fabric */}
      <FlowingFabric />

      {/* Golden particle dust */}
      <GoldenParticles />

      {/* Slow auto-rotating camera - no user interaction */}
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.3}
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={[DARK_BG, 8, 22]} />
    </>
  );
}

// ---------- Main Exported Component ----------

export default function WelcomeScene() {
  return (
    <div
      className="welcome-scene-container"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{
          position: [0, 0, 7],
          fov: 50,
          near: 0.1,
          far: 50,
        }}
        dpr={[1, 1.5]}
        style={{
          width: "100%",
          height: "100%",
          background: "transparent",
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
