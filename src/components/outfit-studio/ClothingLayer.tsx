import { useMemo } from "react";
import { ClothingItem } from "@/types";
import { getBodyZoneRects, BodyProps, computeBody } from "./MannequinModel";

// Map clothing category to which body zone it occupies
const CATEGORY_ZONE_MAP: Record<string, string> = {
  tops: "chest",
  outerwear: "chest",
  dresses: "chest",
  pants: "hips",
  shorts: "hips",
  shoes: "feet",
  accessories: "head",
  bags: "shoulders", // rendered to the side
};

// Layer order (higher = rendered on top)
const LAYER_ORDER: Record<string, number> = {
  shoes: 1,
  pants: 2,
  shorts: 2,
  dresses: 3,
  tops: 4,
  outerwear: 5,
  bags: 6,
  accessories: 7,
};

// ---------------------------------------------------------------------------
// Bezier contour helpers -- uses the EXACT same math as MannequinModel
// ---------------------------------------------------------------------------

/** Pad a value outward from the center (CX=100). Positive pad pushes outward. */
function padX(x: number, pad: number, cx: number): number {
  return x < cx ? x - pad : x + pad;
}

/**
 * Build an SVG <path> `d` string that traces the torso contour from
 * shoulder down to a given stop-point (waist, hip, or leg bottom).
 *
 * `pad` adds outward offset so clothing slightly overflows the body outline.
 *
 * The path traces: left side top-to-bottom, bottom edge, right side bottom-to-top, top closure.
 */
function buildTorsoClipPath(
  body: BodyProps,
  options: {
    /** How far below shoulder the path starts -- 0 = shoulder line */
    topOffset?: number;
    /** Where the path stops: "waist" | "hip" | "legMid" | "legBot" */
    stopAt: "waist" | "hip" | "legMid" | "legBot";
    /** Outward padding in SVG units */
    pad?: number;
    /** Extra width added to shoulders (for outerwear) */
    extraShoulder?: number;
    /** Include the leg gap cutout (for bottoms) */
    includeLegGap?: boolean;
    /** Start at hip level instead of shoulder */
    startAtHip?: boolean;
  }
): string {
  const m = computeBody(body);
  const CX = m.CX;
  const p = options.pad ?? 3;
  const extraS = options.extraShoulder ?? 0;

  // Key horizontal positions with padding
  const tL_shoulder = padX(CX - m.shoulderW / 2 - extraS, p, CX);
  const tR_shoulder = padX(CX + m.shoulderW / 2 + extraS, p, CX);
  const tL_chest = padX(CX - m.chestW / 2, p, CX);
  const tR_chest = padX(CX + m.chestW / 2, p, CX);
  const tL_waist = padX(CX - m.waistW / 2, p, CX);
  const tR_waist = padX(CX + m.waistW / 2, p, CX);
  const tL_hip = padX(CX - m.hipW / 2, p, CX);
  const tR_hip = padX(CX + m.hipW / 2, p, CX);

  const shoulderY = m.shoulderY + (options.topOffset ?? 0);
  const chestY = m.chestY;
  const waistY = m.waistY;
  const hipY = m.hipY;

  // Determine bottom of clip
  let bottomY: number;
  if (options.stopAt === "waist") {
    bottomY = waistY + 6; // a bit past waist for shirt hem
  } else if (options.stopAt === "hip") {
    bottomY = hipY + 4;
  } else if (options.stopAt === "legMid") {
    bottomY = m.legTop + m.legH * 0.45; // shorts stop roughly at knee
  } else {
    bottomY = m.legBot + 4;
  }

  // For bottoms starting at hip level
  if (options.startAtHip) {
    const legLCenter = CX - m.legGap / 2 - m.legW / 2;
    const legRCenter = CX + m.legGap / 2 + m.legW / 2;
    const legW = m.legW + p * 2;
    const startY = waistY - 2;

    if (options.includeLegGap && (options.stopAt === "legBot" || options.stopAt === "legMid")) {
      // Pants/shorts shape: waist/hip contour on top, two legs at bottom
      const legSplitY = m.legTop + 10; // where the legs separate
      const legBotY = options.stopAt === "legMid" ? bottomY : m.legBot + 4;

      const path = [
        // Start at top-left (waist)
        `M ${tL_waist} ${startY}`,
        // Left side: waist to hip
        `C ${tL_waist - 2} ${waistY + 8}, ${tL_hip - 4} ${hipY - 10}, ${tL_hip} ${hipY}`,
        // Left hip down to leg split
        `L ${tL_hip} ${legSplitY}`,
        // Left leg outer edge going down
        `L ${legLCenter - legW / 2} ${legSplitY}`,
        `C ${legLCenter - legW / 2 - 2} ${legSplitY + (legBotY - legSplitY) * 0.5}, ${legLCenter - legW / 2 - 1} ${legBotY - 15}, ${legLCenter - legW / 2 + 1} ${legBotY}`,
        // Left leg bottom
        `L ${legLCenter + legW / 2 - 1} ${legBotY}`,
        // Left leg inner edge going up
        `C ${legLCenter + legW / 2 + 1} ${legBotY - 15}, ${legLCenter + legW / 2 + 2} ${legSplitY + (legBotY - legSplitY) * 0.5}, ${legLCenter + legW / 2} ${legSplitY}`,
        // Crotch gap
        `L ${CX - m.legGap / 2} ${legSplitY}`,
        `L ${CX - m.legGap / 2} ${legSplitY + 8}`,
        `C ${CX - 2} ${legSplitY + 14}, ${CX + 2} ${legSplitY + 14}, ${CX + m.legGap / 2} ${legSplitY + 8}`,
        `L ${CX + m.legGap / 2} ${legSplitY}`,
        // Right leg inner edge going down
        `L ${legRCenter - legW / 2} ${legSplitY}`,
        `C ${legRCenter - legW / 2 - 2} ${legSplitY + (legBotY - legSplitY) * 0.5}, ${legRCenter - legW / 2 - 1} ${legBotY - 15}, ${legRCenter - legW / 2 + 1} ${legBotY}`,
        // Right leg bottom
        `L ${legRCenter + legW / 2 - 1} ${legBotY}`,
        // Right leg outer edge going up
        `C ${legRCenter + legW / 2 + 1} ${legBotY - 15}, ${legRCenter + legW / 2 + 2} ${legSplitY + (legBotY - legSplitY) * 0.5}, ${legRCenter + legW / 2} ${legSplitY}`,
        // Right hip going up
        `L ${tR_hip} ${legSplitY}`,
        `L ${tR_hip} ${hipY}`,
        // Right side: hip to waist
        `C ${tR_hip + 4} ${hipY - 10}, ${tR_waist + 2} ${waistY + 8}, ${tR_waist} ${startY}`,
        // Top closure
        `L ${tL_waist} ${startY}`,
        "Z",
      ].join(" ");
      return path;
    }

    // Simple bottoms (skirt-like) without leg gap
    const path = [
      `M ${tL_waist} ${startY}`,
      `C ${tL_waist - 2} ${waistY + 8}, ${tL_hip - 4} ${hipY - 10}, ${tL_hip} ${hipY}`,
      `L ${tL_hip} ${bottomY}`,
      `L ${tR_hip} ${bottomY}`,
      `L ${tR_hip} ${hipY}`,
      `C ${tR_hip + 4} ${hipY - 10}, ${tR_waist + 2} ${waistY + 8}, ${tR_waist} ${startY}`,
      `L ${tL_waist} ${startY}`,
      "Z",
    ].join(" ");
    return path;
  }

  // For dress that extends to legs
  if (options.stopAt === "legBot") {
    const flareExtra = 12; // extra flare at hem
    const hemL = tL_hip - flareExtra;
    const hemR = tR_hip + flareExtra;

    const path = [
      // Start at top-left shoulder
      `M ${tL_shoulder} ${shoulderY}`,
      // Left shoulder to chest (bezier)
      `C ${tL_shoulder - 4} ${chestY}, ${tL_chest - 2} ${chestY}, ${tL_chest} ${chestY}`,
      // Left chest to waist (bezier)
      `C ${tL_chest - 2} ${chestY + 10}, ${tL_waist + 2} ${waistY - 8}, ${tL_waist} ${waistY}`,
      // Left waist to hip (bezier)
      `C ${tL_waist - 2} ${waistY + 8}, ${tL_hip - 4} ${hipY - 10}, ${tL_hip} ${hipY}`,
      // Left hip down to hem with flare
      `C ${tL_hip - 2} ${hipY + (bottomY - hipY) * 0.3}, ${hemL + 2} ${bottomY - 20}, ${hemL} ${bottomY}`,
      // Bottom hem
      `L ${hemR} ${bottomY}`,
      // Right hem up to hip with flare
      `C ${hemR - 2} ${bottomY - 20}, ${tR_hip + 2} ${hipY + (bottomY - hipY) * 0.3}, ${tR_hip} ${hipY}`,
      // Right hip to waist (bezier)
      `C ${tR_hip + 4} ${hipY - 10}, ${tR_waist + 2} ${waistY + 8}, ${tR_waist} ${waistY}`,
      // Right waist to chest (bezier)
      `C ${tR_waist - 2} ${waistY - 8}, ${tR_chest + 2} ${chestY + 10}, ${tR_chest} ${chestY}`,
      // Right chest to shoulder (bezier)
      `C ${tR_chest + 4} ${chestY}, ${tR_shoulder + 4} ${chestY}, ${tR_shoulder} ${shoulderY}`,
      // Top closure
      `L ${tL_shoulder} ${shoulderY}`,
      "Z",
    ].join(" ");
    return path;
  }

  // Standard top: shoulder to waist/hip
  const path = [
    // Start at top-left shoulder
    `M ${tL_shoulder} ${shoulderY}`,
    // Left shoulder to chest (bezier)
    `C ${tL_shoulder - 4} ${chestY}, ${tL_chest - 2} ${chestY}, ${tL_chest} ${chestY}`,
    // Left chest to waist (bezier)
    `C ${tL_chest - 2} ${chestY + 10}, ${tL_waist + 2} ${waistY - 8}, ${tL_waist} ${waistY}`,
    ...(options.stopAt === "hip"
      ? [
          // Continue to hip
          `C ${tL_waist - 2} ${waistY + 8}, ${tL_hip - 4} ${hipY - 10}, ${tL_hip} ${hipY}`,
          `L ${tL_hip} ${bottomY}`,
          `L ${tR_hip} ${bottomY}`,
          `L ${tR_hip} ${hipY}`,
          // Right hip to waist
          `C ${tR_hip + 4} ${hipY - 10}, ${tR_waist + 2} ${waistY + 8}, ${tR_waist} ${waistY}`,
        ]
      : [
          // Stop at waist
          `L ${tL_waist} ${bottomY}`,
          `L ${tR_waist} ${bottomY}`,
          `L ${tR_waist} ${waistY}`,
        ]),
    // Right waist to chest (bezier)
    `C ${tR_waist - 2} ${waistY - 8}, ${tR_chest + 2} ${chestY + 10}, ${tR_chest} ${chestY}`,
    // Right chest to shoulder (bezier)
    `C ${tR_chest + 4} ${chestY}, ${tR_shoulder + 4} ${chestY}, ${tR_shoulder} ${shoulderY}`,
    // Top closure
    `L ${tL_shoulder} ${shoulderY}`,
    "Z",
  ].join(" ");
  return path;
}

/**
 * Compute the bounding box of a bezier contour clip path for positioning the <image>.
 * We approximate by extracting all explicit coordinates from the path string.
 */
function pathBounds(d: string): { x: number; y: number; width: number; height: number } {
  // Extract all numbers from the path
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 2) return { x: 0, y: 0, width: 200, height: 400 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Numbers come in x,y pairs (control points and endpoints)
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ---------------------------------------------------------------------------
// ClothingShape -- fallback for items without images (filled bezier paths)
// ---------------------------------------------------------------------------

interface ClothingShapeProps {
  item: ClothingItem;
  body: BodyProps;
  viewHeight: number;
}

function ClothingShape({ item, body, viewHeight }: ClothingShapeProps) {
  const zones = getBodyZoneRects(body);
  const zone = CATEGORY_ZONE_MAP[item.category] ?? "chest";
  const rect = zones[zone as keyof typeof zones] ?? zones.chest;

  const fill = item.color && item.color !== "" ? item.color : "#888888";
  const stroke = "#0A0A0A";
  const sw = 1;

  if (item.category === "shoes") {
    const footZone = zones.feet;
    const shoeW = footZone.width / 2 - 4;
    const shoeH = Math.max(footZone.height, 12);
    const leftCX = footZone.x + shoeW / 2 + 2;
    const rightCX = footZone.x + footZone.width - shoeW / 2 - 2;
    const shoeCY = footZone.y + shoeH / 2;
    return (
      <g>
        <ellipse cx={leftCX} cy={shoeCY} rx={shoeW / 2} ry={shoeH / 2} fill={fill} stroke={stroke} strokeWidth={sw} opacity={0.88} />
        <ellipse cx={rightCX} cy={shoeCY} rx={shoeW / 2} ry={shoeH / 2} fill={fill} stroke={stroke} strokeWidth={sw} opacity={0.88} />
      </g>
    );
  }

  if (item.category === "bags") {
    const chestZone = zones.chest;
    const bx = chestZone.x + chestZone.width + 4;
    const by = chestZone.y + chestZone.height * 0.3;
    const bw = 22;
    const bh = 28;
    return (
      <g>
        <rect x={bx} y={by} width={bw} height={bh} fill={fill} stroke={stroke} strokeWidth={sw} opacity={0.88} />
        <path
          d={`M ${chestZone.x + chestZone.width + 2} ${by - 4} C ${bx - 4} ${by - 12} ${bx + 4} ${by - 12} ${bx + bw / 2} ${by}`}
          fill="none"
          stroke={stroke}
          strokeWidth={0.8}
          opacity={0.6}
        />
      </g>
    );
  }

  if (item.category === "accessories") {
    const headZone = zones.head;
    return (
      <ellipse
        cx={headZone.x + headZone.width / 2}
        cy={headZone.y - 6}
        rx={headZone.width / 2 + 4}
        ry={8}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        opacity={0.82}
      />
    );
  }

  if (item.category === "tops" || item.category === "outerwear") {
    const extra = item.category === "outerwear" ? 6 : 0;
    const d = buildTorsoClipPath(body, {
      stopAt: "waist",
      pad: 3 + extra / 2,
      extraShoulder: extra,
    });
    return (
      <path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        opacity={0.85}
      />
    );
  }

  if (item.category === "dresses") {
    const d = buildTorsoClipPath(body, {
      stopAt: "legBot",
      pad: 3,
    });
    return (
      <path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        opacity={0.85}
      />
    );
  }

  if (item.category === "pants") {
    const d = buildTorsoClipPath(body, {
      stopAt: "legBot",
      pad: 3,
      startAtHip: true,
      includeLegGap: true,
    });
    return (
      <path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        opacity={0.85}
      />
    );
  }

  if (item.category === "shorts") {
    const d = buildTorsoClipPath(body, {
      stopAt: "legMid",
      pad: 3,
      startAtHip: true,
      includeLegGap: true,
    });
    return (
      <path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        opacity={0.85}
      />
    );
  }

  // Fallback: simple rect
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      opacity={0.8}
    />
  );
}

// ---------------------------------------------------------------------------
// ImageClothing -- renders clothing images clipped to bezier body contours
// ---------------------------------------------------------------------------

interface ImageClothingProps {
  item: ClothingItem;
  body: BodyProps;
}

function ImageClothing({ item, body }: ImageClothingProps) {
  const zones = getBodyZoneRects(body);
  const zone = CATEGORY_ZONE_MAP[item.category] ?? "chest";
  const filterId = `soft-edge-${item.id}`;

  if (item.category === "tops" || item.category === "outerwear") {
    const extra = item.category === "outerwear" ? 6 : 0;
    const d = buildTorsoClipPath(body, {
      stopAt: "waist",
      pad: 3 + extra / 2,
      extraShoulder: extra,
    });
    const clipId = `clip-${item.id}`;
    const bounds = pathBounds(d);
    // Expand image bounds slightly for better coverage
    const imgPad = 4;
    return (
      <g>
        <defs>
          <filter id={filterId} x="-4%" y="-4%" width="108%" height="108%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
          </filter>
          <clipPath id={clipId}>
            <path d={d} />
          </clipPath>
        </defs>
        <image
          href={item.imageUrl ?? ""}
          x={bounds.x - imgPad}
          y={bounds.y - imgPad}
          width={bounds.width + imgPad * 2}
          height={bounds.height + imgPad * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.92}
        />
        <path
          d={d}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={0.6}
          opacity={0.35}
          filter={`url(#${filterId})`}
        />
      </g>
    );
  }

  if (item.category === "dresses") {
    const d = buildTorsoClipPath(body, {
      stopAt: "legBot",
      pad: 3,
    });
    const clipId = `clip-${item.id}`;
    const bounds = pathBounds(d);
    const imgPad = 4;
    return (
      <g>
        <defs>
          <filter id={filterId} x="-4%" y="-4%" width="108%" height="108%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
          </filter>
          <clipPath id={clipId}>
            <path d={d} />
          </clipPath>
        </defs>
        <image
          href={item.imageUrl ?? ""}
          x={bounds.x - imgPad}
          y={bounds.y - imgPad}
          width={bounds.width + imgPad * 2}
          height={bounds.height + imgPad * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.92}
        />
        <path
          d={d}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={0.6}
          opacity={0.35}
          filter={`url(#${filterId})`}
        />
      </g>
    );
  }

  if (item.category === "pants") {
    const d = buildTorsoClipPath(body, {
      stopAt: "legBot",
      pad: 3,
      startAtHip: true,
      includeLegGap: true,
    });
    const clipId = `clip-${item.id}`;
    const bounds = pathBounds(d);
    const imgPad = 4;
    return (
      <g>
        <defs>
          <filter id={filterId} x="-4%" y="-4%" width="108%" height="108%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
          </filter>
          <clipPath id={clipId}>
            <path d={d} />
          </clipPath>
        </defs>
        <image
          href={item.imageUrl ?? ""}
          x={bounds.x - imgPad}
          y={bounds.y - imgPad}
          width={bounds.width + imgPad * 2}
          height={bounds.height + imgPad * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.92}
        />
        <path
          d={d}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={0.6}
          opacity={0.35}
          filter={`url(#${filterId})`}
        />
      </g>
    );
  }

  if (item.category === "shorts") {
    const d = buildTorsoClipPath(body, {
      stopAt: "legMid",
      pad: 3,
      startAtHip: true,
      includeLegGap: true,
    });
    const clipId = `clip-${item.id}`;
    const bounds = pathBounds(d);
    const imgPad = 4;
    return (
      <g>
        <defs>
          <filter id={filterId} x="-4%" y="-4%" width="108%" height="108%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
          </filter>
          <clipPath id={clipId}>
            <path d={d} />
          </clipPath>
        </defs>
        <image
          href={item.imageUrl ?? ""}
          x={bounds.x - imgPad}
          y={bounds.y - imgPad}
          width={bounds.width + imgPad * 2}
          height={bounds.height + imgPad * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.92}
        />
        <path
          d={d}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={0.6}
          opacity={0.35}
          filter={`url(#${filterId})`}
        />
      </g>
    );
  }

  if (item.category === "shoes") {
    const footZone = zones.feet;
    const shoeW = footZone.width / 2 - 4;
    const shoeH = Math.max(footZone.height, 12);
    const leftCX = footZone.x + shoeW / 2 + 2;
    const rightCX = footZone.x + footZone.width - shoeW / 2 - 2;
    const shoeCY = footZone.y + shoeH / 2;
    const clipIdL = `clip-${item.id}-L`;
    const clipIdR = `clip-${item.id}-R`;
    return (
      <g>
        <defs>
          <clipPath id={clipIdL}>
            <ellipse cx={leftCX} cy={shoeCY} rx={shoeW / 2} ry={shoeH / 2} />
          </clipPath>
          <clipPath id={clipIdR}>
            <ellipse cx={rightCX} cy={shoeCY} rx={shoeW / 2} ry={shoeH / 2} />
          </clipPath>
        </defs>
        <image href={item.imageUrl ?? ""} x={leftCX - shoeW / 2} y={shoeCY - shoeH / 2} width={shoeW} height={shoeH} clipPath={`url(#${clipIdL})`} preserveAspectRatio="xMidYMid slice" opacity={0.9} />
        <image href={item.imageUrl ?? ""} x={rightCX - shoeW / 2} y={shoeCY - shoeH / 2} width={shoeW} height={shoeH} clipPath={`url(#${clipIdR})`} preserveAspectRatio="xMidYMid slice" opacity={0.9} />
      </g>
    );
  }

  if (item.category === "accessories") {
    const headZone = zones.head;
    const clipId = `clip-${item.id}`;
    const rx = headZone.width / 2 + 4;
    const ry = 8;
    const cx = headZone.x + headZone.width / 2;
    const cy = headZone.y - 6;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
          </clipPath>
        </defs>
        <image href={item.imageUrl ?? ""} x={cx - rx} y={cy - ry} width={rx * 2} height={ry * 2} clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" opacity={0.9} />
      </g>
    );
  }

  if (item.category === "bags") {
    const chestZone = zones.chest;
    const bx = chestZone.x + chestZone.width + 4;
    const by = chestZone.y + chestZone.height * 0.3;
    const bw = 22;
    const bh = 28;
    const clipId = `clip-${item.id}`;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={bx} y={by} width={bw} height={bh} />
          </clipPath>
        </defs>
        <image href={item.imageUrl ?? ""} x={bx} y={by} width={bw} height={bh} clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" opacity={0.9} />
        <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke="#0A0A0A" strokeWidth={0.8} opacity={0.5} />
      </g>
    );
  }

  // Fallback to zone rect
  const rect = zones[zone as keyof typeof zones] ?? zones.chest;
  return (
    <image
      href={item.imageUrl ?? ""}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      preserveAspectRatio="xMidYMid slice"
      opacity={0.9}
    />
  );
}

// ---------------------------------------------------------------------------
// Main ClothingLayer component
// ---------------------------------------------------------------------------

interface ClothingLayerProps {
  items: ClothingItem[];
  body: BodyProps;
  viewHeight: number;
  onRemove: (id: string) => void;
}

export default function ClothingLayer({ items, body, viewHeight }: ClothingLayerProps) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => (LAYER_ORDER[a.category] ?? 5) - (LAYER_ORDER[b.category] ?? 5)),
    [items]
  );

  return (
    <g>
      {sorted.map((item) =>
        item.imageUrl ? (
          <ImageClothing key={item.id} item={item} body={body} />
        ) : (
          <ClothingShape key={item.id} item={item} body={body} viewHeight={viewHeight} />
        )
      )}
    </g>
  );
}
