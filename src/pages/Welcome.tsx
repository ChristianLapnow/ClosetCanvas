import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import WelcomeScene from "@/components/three/WelcomeScene";

const features = [
  {
    icon: "\uD83D\uDC57",
    title: "Smart wardrobe",
    desc: "catalog every piece you own",
  },
  {
    icon: "\u2728",
    title: "Style AI",
    desc: "get outfit suggestions tailored to you",
  },
  {
    icon: "\uD83D\uDCC5",
    title: "Outfit planner",
    desc: "plan your looks ahead of time",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 18,
      mass: 0.8,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 16,
      mass: 0.7,
    },
  },
};

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{ background: "#1A1410" }}
    >
      {/* 3D Background Layer */}
      <WelcomeScene />

      {/* Subtle radial overlay for depth */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, transparent 0%, rgba(26,20,16,0.5) 70%, rgba(26,20,16,0.85) 100%)",
          zIndex: 0,
        }}
      />

      {/* Content Layer */}
      <motion.div
        className="relative flex flex-col flex-1 max-w-lg mx-auto w-full px-6 pt-16 pb-12"
        style={{ zIndex: 1 }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo / Brand pill */}
        <motion.div variants={fadeUpVariants} className="mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase backdrop-blur-md"
            style={{
              borderColor: "rgba(201,169,110,0.3)",
              color: "#C9A96E",
              background: "rgba(201,169,110,0.08)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: "#C9A96E" }}
            />
            Style Intelligence
          </div>
        </motion.div>

        {/* Hero headline */}
        <motion.div variants={fadeUpVariants} className="mb-6">
          <h1
            className="leading-none mb-4"
            style={{
              fontSize: "clamp(3rem, 10vw, 4.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.0,
              color: "rgba(255,248,240,0.95)",
            }}
          >
            Closet
            <br />
            <span
              style={{
                color: "#C9A96E",
                textShadow:
                  "0 0 30px rgba(201,169,110,0.4), 0 0 60px rgba(201,169,110,0.15)",
              }}
            >
              Canvas.
            </span>
          </h1>
          <p
            className="text-lg leading-relaxed font-medium"
            style={{ color: "rgba(232,213,183,0.7)" }}
          >
            Your personal style,
            <br />
            perfectly organized.
          </p>
        </motion.div>

        {/* Feature list */}
        <motion.div
          className="flex flex-col gap-3 mb-12"
          variants={containerVariants}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={cardVariants}
              className="flex items-center gap-4 p-4 rounded-2xl border"
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderColor: "rgba(201,169,110,0.12)",
                boxShadow:
                  "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <span
                  className="font-semibold text-sm"
                  style={{ color: "rgba(255,248,240,0.9)" }}
                >
                  {f.title}
                </span>
                <span
                  className="text-sm"
                  style={{ color: "rgba(232,213,183,0.5)" }}
                >
                  {" "}
                  &mdash; {f.desc}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div variants={fadeUpVariants} className="mt-auto flex flex-col gap-3">
          <motion.button
            onClick={() => navigate("/login?tab=signup")}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg tracking-tight"
            style={{
              background: "linear-gradient(135deg, #C9A96E 0%, #A07850 100%)",
              boxShadow: "0 8px 32px rgba(201,169,110,0.3)",
            }}
            whileHover={{
              boxShadow:
                "0 8px 40px rgba(201,169,110,0.5), 0 0 60px rgba(201,169,110,0.2)",
              scale: 1.015,
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            Sign Up
          </motion.button>
          <motion.button
            onClick={() => navigate("/login?tab=login")}
            className="w-full py-4 rounded-2xl font-bold text-lg tracking-tight border"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(201,169,110,0.3)",
              color: "#C9A96E",
            }}
            whileHover={{
              background: "rgba(255,255,255,0.1)",
              scale: 1.015,
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            Sign In
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
