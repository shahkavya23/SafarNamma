import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { Sparkles } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: "text" | "icon";
  /** Shown before the label in text mode, and in place of the sparkle in icon mode. */
  icon?: React.ReactNode;
  /** Outer size in px. Text mode defaults to 142×46, icon mode to 46×46. */
  width?: number;
  height?: number;
  fontSize?: number;
  className?: string;
}

const IDLE_SPEED = 0.6;
const HOVER_SPEED = 1;
const CLICK_SPEED = 2.4;
const EASE_BACK = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// @paper-design/shaders ≥0.0.80 wants colours and sizing as uniforms; without them the rim renders black
const SHADER_UNIFORMS = {
  u_colorBack: [0, 0, 0, 0],
  u_colorTint: [1, 1, 1, 1],
  u_isImage: false,
  u_repetition: 4,
  u_softness: 0.5,
  u_shiftRed: 0.3,
  u_shiftBlue: 0.3,
  u_distortion: 0,
  u_contour: 0,
  u_angle: 45,
  u_shape: 0,
  u_fit: 0,
  u_scale: 1,
  u_rotation: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_offsetX: 0.1,
  u_offsetY: -0.1,
  u_worldWidth: 0,
  u_worldHeight: 0,
};

export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
  icon,
  width,
  height,
  fontSize = 14,
  className = "",
}: LiquidMetalButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<ShaderMount | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);
  const hovered = useRef(false);
  const reduced = useRef(false);

  const dimensions = useMemo(() => {
    const h = height ?? 46;
    const w = viewMode === "icon" ? h : (width ?? 142);
    return { width: w, height: h, innerWidth: w - 4, innerHeight: h - 4 };
  }, [viewMode, width, height]);

  const restingSpeed = () => (reduced.current ? 0 : hovered.current ? HOVER_SPEED : IDLE_SPEED);

  useEffect(() => {
    const styleId = "shader-canvas-style-exploded";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .shader-container-exploded canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
        }
        @keyframes ripple-animation {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;

    if (shaderRef.current) {
      try {
        shaderMount.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          SHADER_UNIFORMS,
          undefined,
          restingSpeed(),
        );
      } catch (error) {
        console.error("Failed to load liquid metal shader:", error);
      }
    }

    const onMotionPref = () => {
      reduced.current = mq.matches;
      shaderMount.current?.setSpeed(restingSpeed());
    };
    mq.addEventListener("change", onMotionPref);

    return () => {
      mq.removeEventListener("change", onMotionPref);
      shaderMount.current?.dispose();
      shaderMount.current = null;
    };
  }, []);

  const handlePointerEnter = () => {
    hovered.current = true;
    shaderMount.current?.setSpeed(restingSpeed());
  };

  const handlePointerLeave = () => {
    hovered.current = false;
    setIsPressed(false);
    shaderMount.current?.setSpeed(restingSpeed());
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!reduced.current) {
      shaderMount.current?.setSpeed(CLICK_SPEED);
      setTimeout(() => shaderMount.current?.setSpeed(restingSpeed()), 300);
    }

    if (buttonRef.current && !reduced.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Keyboard clicks report 0,0: ripple from the centre instead
      const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
      const ripple = { x, y, id: rippleId.current++ };

      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }

    onClick?.();
  };

  const layer: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    transformStyle: "preserve-3d",
    transition: `all 0.8s ${EASE_BACK}, width 0.4s ease, height 0.4s ease`,
  };
  const press = isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)";

  return (
    <div className={`relative inline-block ${className}`}>
      <div style={{ perspective: "1000px", perspectiveOrigin: "50% 50%" }}>
        <div
          style={{
            position: "relative",
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            transformStyle: "preserve-3d",
            transition: `all 0.8s ${EASE_BACK}, width 0.4s ease, height 0.4s ease`,
          }}
        >
          {/* Label */}
          <div
            style={{
              ...layer,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transform: `translateZ(20px) ${press}`,
              zIndex: 30,
              pointerEvents: "none",
              color: "#ECECEC",
              filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.5))",
            }}
          >
            {viewMode === "icon" ? (
              (icon ?? <Sparkles size={16} />)
            ) : (
              <>
                {icon}
                <span style={{ fontSize: `${fontSize}px`, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
              </>
            )}
          </div>

          {/* Black face */}
          <div style={{ ...layer, transform: `translateZ(10px) ${press}`, zIndex: 20 }}>
            <div
              style={{
                width: `${dimensions.innerWidth}px`,
                height: `${dimensions.innerHeight}px`,
                margin: "2px",
                borderRadius: "100px",
                background: "linear-gradient(180deg, #202020 0%, #000000 100%)",
                boxShadow: isPressed
                  ? "inset 0px 2px 4px rgba(0, 0, 0, 0.4), inset 0px 1px 2px rgba(0, 0, 0, 0.3)"
                  : "none",
                transition: `all 0.8s ${EASE_BACK}, width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            />
          </div>

          {/* Liquid metal rim */}
          <div style={{ ...layer, transform: `translateZ(0px) ${press}`, zIndex: 10 }}>
            <div
              style={{
                height: `${dimensions.height}px`,
                width: `${dimensions.width}px`,
                borderRadius: "100px",
                boxShadow: isPressed
                  ? "0px 0px 0px 1px rgba(0, 0, 0, 0.5), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)"
                  : "0px 0px 0px 1px rgba(0, 0, 0, 0.3), 0px 36px 14px 0px rgba(0, 0, 0, 0.02), 0px 20px 12px 0px rgba(0, 0, 0, 0.08), 0px 9px 9px 0px rgba(0, 0, 0, 0.12), 0px 2px 5px 0px rgba(0, 0, 0, 0.15)",
                transition: `all 0.8s ${EASE_BACK}, width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            >
              <div
                ref={shaderRef}
                className="shader-container-exploded"
                style={{
                  borderRadius: "100px",
                  overflow: "hidden",
                  position: "relative",
                  width: `${dimensions.width}px`,
                  maxWidth: `${dimensions.width}px`,
                  height: `${dimensions.height}px`,
                  transition: "width 0.4s ease, height 0.4s ease",
                }}
              />
            </div>
          </div>

          <button
            ref={buttonRef}
            type="button"
            onClick={handleClick}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onPointerDown={() => setIsPressed(true)}
            onPointerUp={() => setIsPressed(false)}
            onPointerCancel={() => setIsPressed(false)}
            className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-ink,#111)]"
            style={{
              ...layer,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              zIndex: 40,
              transform: "translateZ(25px)",
              overflow: "hidden",
              borderRadius: "100px",
            }}
            aria-label={label}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                style={{
                  position: "absolute",
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)",
                  pointerEvents: "none",
                  animation: "ripple-animation 0.6s ease-out",
                }}
              />
            ))}
          </button>
        </div>
      </div>
    </div>
  );
}
