import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Palette ──────────────────────────────────────────────────────────
const GOLD = new THREE.Color("#C9A96E");
const BLUSH = new THREE.Color("#D4A9A9");
const CREAM = new THREE.Color("#E8DCC8");
const WARM_WHITE = new THREE.Color("#F5F0E8");

// ── Soft gradient background plane ──────────────────────────────────
function GradientPlane() {
  const mesh = useRef<THREE.Mesh>(null!);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColorTop: { value: new THREE.Color("#F7F3ED") },
        uColorBottom: { value: new THREE.Color("#EDE4D6") },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorTop;
        uniform vec3 uColorBottom;
        varying vec2 vUv;
        void main() {
          vec3 color = mix(uColorBottom, uColorTop, vUv.y);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
    });
  }, []);

  return (
    <mesh ref={mesh} position={[0, 0, -12]} renderOrder={-1}>
      <planeGeometry args={[40, 30]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ── Single floating orb ─────────────────────────────────────────────
interface OrbConfig {
  startPosition: [number, number, number];
  color: THREE.Color;
  scale: number;
  speed: number;
  radius: number;
  phaseX: number;
  phaseY: number;
  opacity: number;
}

function FloatingOrb({ config }: { config: OrbConfig }) {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * config.speed;
    mesh.current.position.x =
      config.startPosition[0] + Math.sin(t + config.phaseX) * config.radius;
    mesh.current.position.y =
      config.startPosition[1] + Math.cos(t * 0.7 + config.phaseY) * config.radius * 0.6;
    mesh.current.position.z =
      config.startPosition[2] + Math.sin(t * 0.5) * 0.3;
  });

  return (
    <mesh ref={mesh} position={config.startPosition}>
      <sphereGeometry args={[config.scale, 16, 16]} />
      <meshStandardMaterial
        color={config.color}
        transparent
        opacity={config.opacity}
        emissive={config.color}
        emissiveIntensity={0.15}
        roughness={0.9}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── All orbs ────────────────────────────────────────────────────────
function FloatingOrbs() {
  const orbConfigs = useMemo<OrbConfig[]>(() => {
    const colors = [GOLD, BLUSH, CREAM, WARM_WHITE, GOLD, BLUSH];
    return [
      {
        startPosition: [-3.5, 2.0, -6] as [number, number, number],
        color: colors[0],
        scale: 0.35,
        speed: 0.15,
        radius: 1.2,
        phaseX: 0,
        phaseY: 1.5,
        opacity: 0.12,
      },
      {
        startPosition: [4.0, -1.5, -8] as [number, number, number],
        color: colors[1],
        scale: 0.5,
        speed: 0.1,
        radius: 1.5,
        phaseX: 2.0,
        phaseY: 0.5,
        opacity: 0.09,
      },
      {
        startPosition: [-1.0, 3.5, -7] as [number, number, number],
        color: colors[2],
        scale: 0.4,
        speed: 0.12,
        radius: 1.0,
        phaseX: 1.0,
        phaseY: 3.0,
        opacity: 0.1,
      },
      {
        startPosition: [2.5, 0.5, -9] as [number, number, number],
        color: colors[3],
        scale: 0.6,
        speed: 0.08,
        radius: 1.8,
        phaseX: 3.5,
        phaseY: 0.8,
        opacity: 0.07,
      },
      {
        startPosition: [-4.5, -2.5, -7] as [number, number, number],
        color: colors[4],
        scale: 0.3,
        speed: 0.18,
        radius: 0.8,
        phaseX: 0.5,
        phaseY: 2.2,
        opacity: 0.11,
      },
      {
        startPosition: [1.0, -3.0, -10] as [number, number, number],
        color: colors[5],
        scale: 0.45,
        speed: 0.09,
        radius: 1.4,
        phaseX: 4.0,
        phaseY: 1.0,
        opacity: 0.08,
      },
    ];
  }, []);

  return (
    <>
      {orbConfigs.map((config, i) => (
        <FloatingOrb key={i} config={config} />
      ))}
    </>
  );
}

// ── Wireframe torus ring ────────────────────────────────────────────
function WireframeRing() {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    mesh.current.rotation.x = t * 0.03;
    mesh.current.rotation.y = t * 0.05;
    mesh.current.rotation.z = t * 0.02;
  });

  return (
    <mesh ref={mesh} position={[1.5, 0.5, -8]}>
      <torusGeometry args={[2.5, 0.015, 16, 64]} />
      <meshStandardMaterial
        color={GOLD}
        transparent
        opacity={0.08}
        emissive={GOLD}
        emissiveIntensity={0.1}
        wireframe
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Scene contents ──────────────────────────────────────────────────
function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} color="#F5EDE0" />
      <directionalLight position={[5, 5, 5]} intensity={0.3} color="#F0E6D3" />
      <pointLight position={[-3, 2, -4]} intensity={0.15} color="#C9A96E" distance={15} />

      {/* Background gradient */}
      <GradientPlane />

      {/* Floating bokeh orbs */}
      <FloatingOrbs />

      {/* Geometric accent */}
      <WireframeRing />
    </>
  );
}

// ── Exported background component ───────────────────────────────────
export default function AmbientBackground() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
