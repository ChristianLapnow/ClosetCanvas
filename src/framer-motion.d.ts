/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { Transition, TargetAndTransition } from "framer-motion";

// Framer Motion v12 ships MotionProps that depend on motion-dom types which
// may not resolve correctly, leaving animation-related props missing.
// This augmentation restores them so motion.div, motion.button, etc. accept
// variants, animate, initial, whileHover, whileTap, layoutId, exit and transition.
type VariantLabels = string | string[];
type AnimationTarget = boolean | VariantLabels | TargetAndTransition;
type AnimationEventHandler = () => void;
type VariantMap = Record<string, Record<string, unknown>>;

declare module "framer-motion" {
  interface MotionProps {
    initial?: AnimationTarget;
    animate?: AnimationTarget;
    exit?: AnimationTarget;
    variants?: VariantMap;
    transition?: Transition;
    whileHover?: AnimationTarget;
    whileTap?: AnimationTarget;
    whileFocus?: AnimationTarget;
    whileDrag?: AnimationTarget;
    whileInView?: AnimationTarget;
    layout?: boolean | "position" | "size" | "preserve-aspect";
    layoutId?: string;
    onAnimationStart?: AnimationEventHandler;
    onAnimationComplete?: AnimationEventHandler;
    custom?: number | string | Record<string, unknown>;
  }
}
