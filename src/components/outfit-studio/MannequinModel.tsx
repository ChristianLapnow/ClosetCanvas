import { useMemo } from "react";

export interface BodyProps {
  height: number;    // 0-100
  shoulders: number; // 0-100
  waist: number;     // 0-100
  hips: number;      // 0-100
  chest: number;     // 0-100
  legs: number;      // 0-100 (leg length)
}

export interface BodyZoneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BodyZone = "head" | "neck" | "shoulders" | "chest" | "waist" | "hips" | "legs" | "feet";

// Compute all anatomical measurements from body props
export function computeBody(body: BodyProps) {
  const CX = 100; // horizontal center of 200-wide viewBox

  // --- vertical positions ---
  const headH = 42;
  const headW = 28;
  const headTop = 10;
  const headCY = headTop + headH / 2;

  const neckTop = headTop + headH - 2;
  const neckH = 14;
  const neckW = 12;
  const neckBot = neckTop + neckH;

  const torsoH = 82 + (body.height - 50) * 0.55;
  const torsoTop = neckBot;
  const torsoBot = torsoTop + torsoH;

  const legH = 145 + (body.height - 50) * 1.0 + (body.legs - 50) * 0.8;
  const legTop = torsoBot;
  const legBot = legTop + legH;

  const footH = 14;
  const footTop = legBot;
  const footBot = footTop + footH;

  // --- horizontal widths (expanded by ~15%) ---
  const shoulderW = 71 + (body.shoulders - 50) * 0.86;
  const chestW = 51 + (body.chest - 50) * 0.58;
  const waistW = 37 + (body.waist - 50) * 0.52;
  const hipW = 64 + (body.hips - 50) * 0.75;
  const legW = 18;
  const legGap = 8;
  const footW = 18;
  const armW = 12;

  // --- key vertical landmarks in torso ---
  const shoulderY = torsoTop + 4;
  const chestY = torsoTop + torsoH * 0.3;
  const waistY = torsoTop + torsoH * 0.62;
  const hipY = torsoBot - 4;

  // arm
  const armTop = shoulderY + 2;
  const armBot = torsoBot - 6;

  return {
    CX,
    // head
    headCX: CX, headCY, headW, headH, headTop,
    // neck
    neckTop, neckBot, neckH, neckW,
    // torso landmarks
    shoulderW, chestW, waistW, hipW,
    shoulderY, chestY, waistY, hipY,
    torsoTop, torsoBot, torsoH,
    // arms
    armTop, armBot, armW,
    // legs
    legH, legTop, legBot, legW, legGap,
    // feet
    footH, footTop, footBot, footW,
  };
}

export function getBodyZoneRects(body: BodyProps): Record<BodyZone, BodyZoneRect> {
  const m = computeBody(body);
  const CX = m.CX;

  return {
    head: {
      x: CX - m.headW,
      y: m.headTop,
      width: m.headW * 2,
      height: m.headH,
    },
    neck: {
      x: CX - m.neckW / 2,
      y: m.neckTop,
      width: m.neckW,
      height: m.neckH,
    },
    shoulders: {
      x: CX - m.shoulderW / 2,
      y: m.shoulderY - 6,
      width: m.shoulderW,
      height: 18,
    },
    chest: {
      x: CX - m.chestW / 2,
      y: m.torsoTop,
      width: m.chestW,
      height: m.chestY - m.torsoTop + 10,
    },
    waist: {
      x: CX - m.waistW / 2,
      y: m.chestY + 8,
      width: m.waistW,
      height: m.waistY - m.chestY - 4,
    },
    hips: {
      x: CX - m.hipW / 2,
      y: m.waistY,
      width: m.hipW,
      height: m.torsoBot - m.waistY + 4,
    },
    legs: {
      x: CX - m.hipW / 2,
      y: m.legTop,
      width: m.hipW,
      height: m.legH,
    },
    feet: {
      x: CX - m.hipW / 2,
      y: m.footTop,
      width: m.hipW,
      height: m.footH + 4,
    },
  };
}

export interface MannequinModelProps {
  body: BodyProps;
}

export default function MannequinModel({ body }: MannequinModelProps) {
  const m = useMemo(() => computeBody(body), [body]);

  // --- Build SVG paths ---

  // HEAD: ellipse
  const headRx = m.headW;
  const headRy = m.headH / 2;

  // TORSO: bezier hourglass
  const tL_shoulder = m.CX - m.shoulderW / 2;
  const tR_shoulder = m.CX + m.shoulderW / 2;
  const tL_chest = m.CX - m.chestW / 2;
  const tR_chest = m.CX + m.chestW / 2;
  const tL_waist = m.CX - m.waistW / 2;
  const tR_waist = m.CX + m.waistW / 2;
  const tL_hip = m.CX - m.hipW / 2;
  const tR_hip = m.CX + m.hipW / 2;

  const torsoPath = [
    `M ${tL_shoulder} ${m.shoulderY}`,
    `C ${tL_shoulder - 4} ${m.chestY}, ${tL_chest - 2} ${m.chestY}, ${tL_chest} ${m.chestY}`,
    `C ${tL_chest - 2} ${m.chestY + 10}, ${tL_waist + 2} ${m.waistY - 8}, ${tL_waist} ${m.waistY}`,
    `C ${tL_waist - 2} ${m.waistY + 8}, ${tL_hip - 4} ${m.hipY - 10}, ${tL_hip} ${m.hipY}`,
    `L ${tR_hip} ${m.hipY}`,
    `C ${tR_hip + 4} ${m.hipY - 10}, ${tR_waist + 2} ${m.waistY + 8}, ${tR_waist} ${m.waistY}`,
    `C ${tR_waist - 2} ${m.waistY - 8}, ${tR_chest + 2} ${m.chestY + 10}, ${tR_chest} ${m.chestY}`,
    `C ${tR_chest + 4} ${m.chestY}, ${tR_shoulder + 4} ${m.chestY}, ${tR_shoulder} ${m.shoulderY}`,
    `C ${tR_shoulder - 6} ${m.torsoTop}, ${m.CX + m.neckW / 2 + 6} ${m.torsoTop}, ${m.CX + m.neckW / 2} ${m.neckBot}`,
    `L ${m.CX - m.neckW / 2} ${m.neckBot}`,
    `C ${m.CX - m.neckW / 2 - 6} ${m.torsoTop}, ${tL_shoulder + 6} ${m.torsoTop}, ${tL_shoulder} ${m.shoulderY}`,
    "Z",
  ].join(" ");

  // LEFT ARM
  const armLx1 = tL_shoulder - 2;
  const armLx2 = tL_shoulder - m.armW - 4;
  const armLxBot = tL_shoulder - m.armW - 2;
  const leftArmPath = [
    `M ${armLx1} ${m.armTop}`,
    `C ${armLx1 - 6} ${m.armTop + 20}, ${armLx2 - 4} ${m.armBot - 40}, ${armLxBot} ${m.armBot}`,
    `L ${armLxBot + m.armW} ${m.armBot}`,
    `C ${armLx2 + m.armW + 4} ${m.armBot - 40}, ${armLx1 + m.armW - 6} ${m.armTop + 20}, ${armLx1 + m.armW + 2} ${m.armTop}`,
    "Z",
  ].join(" ");

  // RIGHT ARM: mirror
  const armRx1 = tR_shoulder + 2;
  const armRx2 = tR_shoulder + m.armW + 4;
  const armRxBot = tR_shoulder + m.armW + 2;
  const rightArmPath = [
    `M ${armRx1} ${m.armTop}`,
    `C ${armRx1 + 6} ${m.armTop + 20}, ${armRx2 + 4} ${m.armBot - 40}, ${armRxBot} ${m.armBot}`,
    `L ${armRxBot - m.armW} ${m.armBot}`,
    `C ${armRx2 - m.armW - 4} ${m.armBot - 40}, ${armRx1 - m.armW + 6} ${m.armTop + 20}, ${armRx1 - m.armW - 2} ${m.armTop}`,
    "Z",
  ].join(" ");

  // LEFT LEG
  const legLCenter = m.CX - m.legGap / 2 - m.legW / 2;
  const leftLegPath = [
    `M ${legLCenter - m.legW / 2} ${m.legTop}`,
    `C ${legLCenter - m.legW / 2 - 2} ${m.legTop + m.legH * 0.5}, ${legLCenter - m.legW / 2 - 3} ${m.legBot - 20}, ${legLCenter - m.legW / 2} ${m.legBot}`,
    `L ${legLCenter + m.legW / 2} ${m.legBot}`,
    `C ${legLCenter + m.legW / 2 + 3} ${m.legBot - 20}, ${legLCenter + m.legW / 2 + 2} ${m.legTop + m.legH * 0.5}, ${legLCenter + m.legW / 2} ${m.legTop}`,
    "Z",
  ].join(" ");

  // RIGHT LEG
  const legRCenter = m.CX + m.legGap / 2 + m.legW / 2;
  const rightLegPath = [
    `M ${legRCenter - m.legW / 2} ${m.legTop}`,
    `C ${legRCenter - m.legW / 2 - 2} ${m.legTop + m.legH * 0.5}, ${legRCenter - m.legW / 2 - 3} ${m.legBot - 20}, ${legRCenter - m.legW / 2} ${m.legBot}`,
    `L ${legRCenter + m.legW / 2} ${m.legBot}`,
    `C ${legRCenter + m.legW / 2 + 3} ${m.legBot - 20}, ${legRCenter + m.legW / 2 + 2} ${m.legTop + m.legH * 0.5}, ${legRCenter + m.legW / 2} ${m.legTop}`,
    "Z",
  ].join(" ");

  // FEET
  const footLCX = legLCenter;
  const footRCX = legRCenter;

  return (
    <g>
      <defs>
        <filter id="body-shadow" x="-20%" y="-10%" width="140%" height="120%">
          <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#3D3028" floodOpacity="0.12" />
        </filter>
      </defs>

      <g filter="url(#body-shadow)">
        {/* ARMS (behind torso) */}
        <path d={leftArmPath} fill="rgba(250,247,244,0.08)" stroke="#3D3028" strokeWidth="1.2" />
        <path d={rightArmPath} fill="rgba(250,247,244,0.08)" stroke="#3D3028" strokeWidth="1.2" />

        {/* NECK */}
        <rect
          x={m.CX - m.neckW / 2}
          y={m.neckTop}
          width={m.neckW}
          height={m.neckH}
          fill="#FAFAF5"
          stroke="#3D3028"
          strokeWidth="1.2"
        />

        {/* TORSO */}
        <path d={torsoPath} fill="rgba(250,247,244,0.08)" stroke="#3D3028" strokeWidth="1.5" />

        {/* LEGS */}
        <path d={leftLegPath} fill="rgba(250,247,244,0.08)" stroke="#3D3028" strokeWidth="1.2" />
        <path d={rightLegPath} fill="rgba(250,247,244,0.08)" stroke="#3D3028" strokeWidth="1.2" />

        {/* FEET */}
        <ellipse cx={footLCX} cy={m.footTop + m.footH / 2} rx={m.footW / 2} ry={m.footH / 2} fill="rgba(250,247,244,0.30)" stroke="#3D3028" strokeWidth="1.2" />
        <ellipse cx={footRCX} cy={m.footTop + m.footH / 2} rx={m.footW / 2} ry={m.footH / 2} fill="rgba(250,247,244,0.30)" stroke="#3D3028" strokeWidth="1.2" />

        {/* HEAD */}
        <ellipse
          cx={m.headCX}
          cy={m.headCY}
          rx={headRx}
          ry={headRy}
          fill="#FAFAF5"
          stroke="#3D3028"
          strokeWidth="1.5"
        />

        {/* Face detail: eyes */}
        <circle cx={m.CX - 7} cy={m.headCY - 3} r={2} fill="#3D3028" />
        <circle cx={m.CX + 7} cy={m.headCY - 3} r={2} fill="#3D3028" />
        {/* Minimal mouth */}
        <path
          d={`M ${m.CX - 5} ${m.headCY + 6} Q ${m.CX} ${m.headCY + 10} ${m.CX + 5} ${m.headCY + 6}`}
          fill="none"
          stroke="#3D3028"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>

      {/* Subtle collarbone lines */}
      <line
        x1={tL_shoulder + 8}
        y1={m.shoulderY + 2}
        x2={m.CX - m.neckW / 2}
        y2={m.neckBot - 2}
        stroke="#3D3028"
        strokeWidth="0.6"
        opacity={0.4}
        strokeLinecap="round"
      />
      <line
        x1={tR_shoulder - 8}
        y1={m.shoulderY + 2}
        x2={m.CX + m.neckW / 2}
        y2={m.neckBot - 2}
        stroke="#3D3028"
        strokeWidth="0.6"
        opacity={0.4}
        strokeLinecap="round"
      />

      {/* Gold waist indicator */}
      <line
        x1={m.CX - 6}
        y1={m.waistY}
        x2={m.CX + 6}
        y2={m.waistY}
        stroke="#C9A96E"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.7}
      />
    </g>
  );
}
