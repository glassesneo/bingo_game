import { Billboard, Environment, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CuboidCollider,
  Physics,
  type RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const MAX_NUMBER = 75;

// --- Helper function: Generate texture with number ---
function createNumberTexture(number: number, baseColorHsl: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to get 2d context");
  }

  const color = new THREE.Color().setHSL(baseColorHsl, 0.8, 0.6);
  context.fillStyle = `#${color.getHexString()}`;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = "bold 100px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "black";
  context.shadowColor = "rgba(0,0,0,0.3)";
  context.shadowBlur = 10;
  context.fillText(String(number), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  return { texture, color: color.getStyle() };
}

// --- Component: GalaGala (Ball Tumbler) ---
function GalaGala({
  isSpinning,
  onSpinFinish,
}: {
  isSpinning: boolean;
  onSpinFinish: () => void;
}) {
  const api = useRef<RapierRigidBody>(null);
  const totalRotation = useRef(0);
  const isFinishedRef = useRef(false);

  // Initial position adjustment: -90 degrees puts door at bottom
  const angleOffset = -Math.PI / 2;

  // Cache materials to prevent flickering on re-render
  // depthWrite: false prevents z-fighting between overlapping transparent surfaces
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        roughness: 0.1,
        transmission: 1,
        thickness: 2,
        color: "#ffffff",
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    [],
  );

  const doorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ff3333",
        roughness: 0.5,
      }),
    [],
  );

  useFrame((_state, delta) => {
    if (!api.current) return;
    const currentRot = api.current.angvel();

    if (isSpinning) {
      const speed = 3.0 + Math.sin(Date.now() / 200) * 0.5;
      api.current.setAngvel(
        { x: 0, y: 0, z: THREE.MathUtils.lerp(currentRot.z, speed, 0.05) },
        true,
      );
      totalRotation.current += currentRot.z * delta;

      // Stop after 4π (2 full rotations)
      if (totalRotation.current >= 4 * Math.PI && !isFinishedRef.current) {
        isFinishedRef.current = true;

        // Reset rotation to initial state
        api.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        api.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

        onSpinFinish();
      }
    } else {
      // Keep fixed when stopped
      api.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

      if (!isSpinning) {
        totalRotation.current = 0;
        isFinishedRef.current = false;
      }
    }
  });

  return (
    <RigidBody
      ref={api}
      type="kinematicVelocity"
      colliders={false}
      friction={0}
      restitution={0.5}
    >
      <group>
        <mesh position={[0, 0, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 0.2, 6]} />
          <primitive object={glassMaterial} attach="material" />
        </mesh>
        <mesh position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 0.2, 6]} />
          <primitive object={glassMaterial} attach="material" />
        </mesh>

        {[0, 60, 120, 180, 240, 300].map((deg, i) => {
          const rad = (deg * Math.PI) / 180 + angleOffset;

          return (
            <mesh
              key={deg}
              position={[2.2 * Math.cos(rad), 2.2 * Math.sin(rad), 0]}
              rotation={[0, 0, rad]}
            >
              {i === 0 ? (
                <group>
                  <mesh position={[0, 0.8, 0]}>
                    <boxGeometry args={[0.2, 0.9, 3]} />
                    <meshStandardMaterial color="#333" />
                  </mesh>
                  <mesh position={[0, -0.8, 0]}>
                    <boxGeometry args={[0.2, 0.9, 3]} />
                    <meshStandardMaterial color="#333" />
                  </mesh>
                  <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[0.15, 0.7, 3]} />
                    <primitive object={doorMaterial} attach="material" />
                  </mesh>
                </group>
              ) : (
                <>
                  <boxGeometry args={[0.2, 2.5, 3]} />
                  <primitive object={glassMaterial} attach="material" />
                </>
              )}
            </mesh>
          );
        })}
      </group>

      <CuboidCollider
        position={[0, 0, -1.5]}
        args={[2.5, 2.5, 0.1]}
        friction={0}
      />
      <CuboidCollider
        position={[0, 0, 1.5]}
        args={[2.5, 2.5, 0.1]}
        friction={0}
      />

      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180 + angleOffset;

        if (i === 0) {
          return (
            <group
              key={deg}
              position={[2.2 * Math.cos(rad), 2.2 * Math.sin(rad), 0]}
              rotation={[0, 0, rad]}
            >
              <CuboidCollider
                position={[0, 0.8, 0]}
                args={[0.1, 0.45, 1.5]}
                friction={0}
              />
              <CuboidCollider
                position={[0, -0.8, 0]}
                args={[0.1, 0.45, 1.5]}
                friction={0}
              />
              <CuboidCollider
                position={[0, 0, 0]}
                args={[0.1, 0.35, 1.5]}
                friction={0}
              />
            </group>
          );
        }
        return (
          <CuboidCollider
            key={deg}
            position={[2.2 * Math.cos(rad), 2.2 * Math.sin(rad), 0]}
            rotation={[0, 0, rad]}
            args={[0.1, 1.25, 1.5]}
            friction={0}
          />
        );
      })}
    </RigidBody>
  );
}

// --- Component: Numbered Balls ---
function Balls({ count, history }: { count: number; history: number[] }) {
  const ballsData = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const number = i + 1;
      const hue = ((number * 137.5) % 360) / 360;
      const { texture } = createNumberTexture(number, hue);

      const x = (Math.random() - 0.5) * 2;
      const y = (Math.random() - 0.5) * 2;
      const z = (Math.random() - 0.5) * 1.5;

      return { number, texture, pos: [x, y, z] as [number, number, number] };
    });
  }, [count]);

  // Dispose textures on unmount to prevent GPU memory leaks
  useEffect(() => {
    return () => {
      for (const data of ballsData) {
        data.texture.dispose();
      }
    };
  }, [ballsData]);

  return (
    <>
      {ballsData.map((data) => {
        if (history.includes(data.number)) return null;

        return (
          <RigidBody
            key={data.number}
            position={data.pos}
            colliders="ball"
            restitution={0.9}
            friction={0.0}
            ccd
            userData={{ type: "ball", number: data.number }}
          >
            <mesh castShadow>
              <sphereGeometry args={[0.22, 32, 32]} />
              <meshStandardMaterial map={data.texture} roughness={0.2} />
            </mesh>
          </RigidBody>
        );
      })}
    </>
  );
}

// --- Component: Tray ---
function Tray() {
  return (
    <group>
      <RigidBody type="fixed" restitution={0.2} friction={1}>
        <mesh position={[0, -5, 0]}>
          <boxGeometry args={[10, 0.5, 5]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <CuboidCollider position={[0, -5, 0]} args={[5, 0.25, 2.5]} />
        <CuboidCollider position={[0, -4, -2.5]} args={[5, 1, 0.1]} />
        <CuboidCollider position={[0, -4, 2.5]} args={[5, 1, 0.1]} />
      </RigidBody>
      <RigidBody type="fixed" sensor onIntersectionEnter={() => {}}>
        <CuboidCollider position={[0, -4.8, 0]} args={[5, 0.2, 2.5]} />
      </RigidBody>
    </group>
  );
}

// --- Component: Dropping Ball (physics-based) ---
function DroppingBall({ number }: { number: number }) {
  const { texture } = useMemo(() => {
    const hue = ((number * 137.5) % 360) / 360;
    return createNumberTexture(number, hue);
  }, [number]);

  // Dispose texture on unmount
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // Stable random angular velocity to prevent physics resets on re-render
  const angularVelocity = useMemo<[number, number, number]>(
    () => [Math.random(), Math.random(), Math.random()],
    [],
  );

  return (
    <RigidBody
      position={[0, -2.8, -1.0]}
      colliders="ball"
      restitution={0.5}
      friction={0.5}
      angularVelocity={angularVelocity}
    >
      <mesh castShadow>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial map={texture} roughness={0.2} />
      </mesh>
    </RigidBody>
  );
}

// --- Component: Result Display (highlighted) ---
function ResultDisplay({ number }: { number: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const forward = useMemo(() => new THREE.Vector3(), []);

  const { texture, color } = useMemo(() => {
    const hue = ((number * 137.5) % 360) / 360;
    return createNumberTexture(number, hue);
  }, [number]);

  // Dispose texture on unmount
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(() => {
    if (!groupRef.current || !meshRef.current) return;

    camera.getWorldDirection(forward);
    groupRef.current.position
      .copy(camera.position)
      .add(forward.multiplyScalar(3));
    meshRef.current.lookAt(camera.position);
    meshRef.current.rotateY(-Math.PI / 2);
  });

  return (
    <group ref={groupRef} renderOrder={10}>
      <pointLight
        intensity={2}
        distance={5}
        color="white"
        position={[2, 2, 2]}
      />
      <mesh ref={meshRef} scale={[1, 1, 1]} renderOrder={10}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.1}
          metalness={0.2}
          emissive={color}
          emissiveIntensity={0.2}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <Billboard position={[0, -1.5, 0]} follow>
        <Text
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          renderOrder={11}
        >
          BINGO NUMBER!
        </Text>
      </Billboard>
    </group>
  );
}

// --- Props interface ---
interface GaraGaraDrawerProps {
  isSpinning: boolean;
  drawnNumber: number | null; // The actual drawn number from the API
  onSpinFinish: () => void; // Called when animation finishes, parent should call API
  history: number[];
}

// --- Main Component ---
export function GaraGaraDrawer({
  isSpinning,
  drawnNumber,
  onSpinFinish,
  history,
}: GaraGaraDrawerProps) {
  const [showResultDisplay, setShowResultDisplay] = useState(false);
  const [message, setMessage] = useState("READY");
  const [displayedNumber, setDisplayedNumber] = useState<number | null>(null);

  // Update message when spinning starts
  useEffect(() => {
    if (isSpinning) {
      setDisplayedNumber(null);
      setShowResultDisplay(false);
      setMessage("SPINNING...");
    }
  }, [isSpinning]);

  // Update message and display when drawnNumber changes (from API)
  useEffect(() => {
    if (drawnNumber !== null) {
      setDisplayedNumber(drawnNumber);
      setMessage(`Result: ${drawnNumber}!`);

      const timer = setTimeout(() => {
        setShowResultDisplay(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [drawnNumber]);

  const handleSpinAnimationFinish = () => {
    // Just notify parent that animation finished - parent will call API
    onSpinFinish();
  };

  const remainingNumbers = MAX_NUMBER - history.length;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#111",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 0,
          width: "100%",
          textAlign: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <h1
          style={{
            color: "white",
            fontFamily: "Arial Black",
            fontSize: "2rem",
            margin: 0,
            textShadow: "0 0 10px rgba(255,255,255,0.5)",
          }}
        >
          {message}
        </h1>
      </div>

      {/* Remaining count */}
      <div
        style={{
          position: "absolute",
          top: 30,
          right: 30,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <h2
          style={{
            color: "#ccc",
            fontFamily: "Arial",
            fontSize: "1.2rem",
            margin: 0,
          }}
        >
          Remaining: {remainingNumbers} / {MAX_NUMBER}
        </h2>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 0, 13], fov: 45 }}>
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.3}
          penumbra={1}
          intensity={10}
          castShadow
        />

        <Physics gravity={[0, -9.81, 0]}>
          <GalaGala
            isSpinning={isSpinning}
            onSpinFinish={handleSpinAnimationFinish}
          />
          <Balls count={MAX_NUMBER} history={history} />
          <Tray />

          {displayedNumber !== null && (
            <DroppingBall number={displayedNumber} />
          )}
        </Physics>
        {displayedNumber !== null && showResultDisplay && (
          <ResultDisplay number={displayedNumber} />
        )}
      </Canvas>
    </div>
  );
}
