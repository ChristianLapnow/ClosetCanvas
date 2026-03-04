/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type stub for motion-dom package.
 * The installed version (12.23.28) is missing its .d.ts files.
 * This provides the essential types that framer-motion depends on.
 */
declare module "motion-dom" {
  export type Easing =
    | [number, number, number, number]
    | "linear"
    | "easeIn"
    | "easeOut"
    | "easeInOut"
    | "circIn"
    | "circOut"
    | "circInOut"
    | "backIn"
    | "backOut"
    | "backInOut"
    | "anticipate"
    | string;

  export interface Transition {
    type?: "tween" | "spring" | "inertia" | "keyframes" | "just" | string;
    duration?: number;
    delay?: number;
    ease?: Easing | Easing[];
    stiffness?: number;
    damping?: number;
    mass?: number;
    velocity?: number;
    bounce?: number;
    restSpeed?: number;
    restDelta?: number;
    repeat?: number;
    repeatType?: "loop" | "reverse" | "mirror";
    repeatDelay?: number;
    staggerChildren?: number;
    delayChildren?: number;
    when?: "beforeChildren" | "afterChildren" | false;
    [key: string]: any;
  }

  export type Target = {
    [key: string]: any;
  };

  export type TargetAndTransition = Target & {
    transition?: Transition;
  };

  export type Variant = TargetAndTransition | ((custom: any) => TargetAndTransition);

  export type Variants = {
    [key: string]: Variant;
  };

  export interface MotionNodeOptions {
    initial?: boolean | string | string[] | Target;
    animate?: string | string[] | Target | any;
    exit?: string | string[] | Target;
    variants?: Variants;
    transition?: Transition;
    whileHover?: string | string[] | Target;
    whileTap?: string | string[] | Target;
    whileFocus?: string | string[] | Target;
    whileDrag?: string | string[] | Target;
    whileInView?: string | string[] | Target;
    layout?: boolean | "position" | "size" | "preserve-aspect";
    layoutId?: string;
    layoutDependency?: any;
    layoutScroll?: boolean;
    onAnimationStart?: (definition: any) => void;
    onAnimationComplete?: (definition: any) => void;
    onUpdate?: (latest: { [key: string]: any }) => void;
    onLayoutAnimationStart?: () => void;
    onLayoutAnimationComplete?: () => void;
    drag?: boolean | "x" | "y";
    dragConstraints?: false | { top?: number; right?: number; bottom?: number; left?: number } | React.RefObject<Element>;
    dragElastic?: number | boolean | { top?: number; right?: number; bottom?: number; left?: number };
    dragMomentum?: boolean;
    dragTransition?: any;
    dragPropagation?: boolean;
    dragSnapToOrigin?: boolean;
    onDragStart?: (event: MouseEvent | TouchEvent | PointerEvent, info: any) => void;
    onDrag?: (event: MouseEvent | TouchEvent | PointerEvent, info: any) => void;
    onDragEnd?: (event: MouseEvent | TouchEvent | PointerEvent, info: any) => void;
    custom?: any;
  }

  export class MotionValue<V = any> {
    get(): V;
    set(v: V): void;
    getVelocity(): number;
    onChange(callback: (latest: V) => void): () => void;
    on(eventName: string, callback: (...args: any[]) => void): () => void;
    destroy(): void;
  }

  export interface TransformProperties {
    x?: string | number;
    y?: string | number;
    z?: string | number;
    translateX?: string | number;
    translateY?: string | number;
    translateZ?: string | number;
    rotate?: string | number;
    rotateX?: string | number;
    rotateY?: string | number;
    rotateZ?: string | number;
    scale?: string | number;
    scaleX?: string | number;
    scaleY?: string | number;
    scaleZ?: string | number;
    skew?: string | number;
    skewX?: string | number;
    skewY?: string | number;
    originX?: string | number;
    originY?: string | number;
    originZ?: string | number;
    perspective?: string | number;
    transformPerspective?: string | number;
  }

  export interface SVGPathProperties {
    pathLength?: number;
    pathOffset?: number;
    pathSpacing?: number;
  }

  export type UnresolvedValueKeyframe = string | number | null;
  export type AnyResolvedKeyframe = string | number;
  export type ResolvedValues = { [key: string]: string | number };

  export interface OnKeyframesResolved<V> {
    (resolvedKeyframes: V[], finalKeyframe: V): void;
  }

  export interface KeyframeResolver<V> {
    cancel: () => void;
  }

  export type ElementOrSelector = Element | string;

  export interface DOMKeyframesDefinition {
    [key: string]: any;
  }

  export interface AnimationOptions extends Transition {
    [key: string]: any;
  }

  export interface AnimationPlaybackOptions {
    [key: string]: any;
  }

  export interface AnimationScope<T = any> {
    current: T;
  }

  export interface AnimationPlaybackControlsWithThen {
    stop: () => void;
    then: (resolve: () => void, reject?: () => void) => Promise<void>;
  }

  export interface AnimationPlaybackControls {
    stop: () => void;
    play: () => void;
    pause: () => void;
    complete: () => void;
    cancel: () => void;
    speed: number;
    time: number;
    duration: number;
    state: string;
  }

  export interface ValueAnimationTransition extends Transition {
    [key: string]: any;
  }

  export interface ValueTransition extends Transition {
    [key: string]: any;
  }

  export interface EventInfo {
    point: { x: number; y: number };
  }

  export interface MotionValueEventCallbacks<V = any> {
    [key: string]: any;
  }

  export interface SpringOptions {
    stiffness?: number;
    damping?: number;
    mass?: number;
    velocity?: number;
    restSpeed?: number;
    restDelta?: number;
    bounce?: number;
    duration?: number;
  }

  export interface TransformOptions<V = any> {
    [key: string]: any;
  }

  export interface LegacyAnimationControls {
    [key: string]: any;
  }

  export type AnimationDefinition = string | string[] | TargetAndTransition;

  export interface Batcher {
    [key: string]: any;
  }

  export interface JSAnimation {
    [key: string]: any;
  }
}
