"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

// import { RippleButton } from "@/components/ui/multi-type-ripple-buttons";

// --- Internal Helper Components (Not exported) --- //

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ShaderCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glProgramRef = useRef<WebGLProgram | null>(null);
  const glBgColorLocationRef = useRef<WebGLUniformLocation | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const [backgroundColor, setBackgroundColor] = useState([1.0, 1.0, 1.0]);

  useEffect(() => {
    const root = document.documentElement;
    const updateColor = () => {
      const isDark = root.classList.contains("dark");
      setBackgroundColor(isDark ? [0, 0, 0] : [1.0, 1.0, 1.0]);
    };
    updateColor();
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          updateColor();
        }
      }
    });
    observer.observe(root, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const gl = glRef.current;
    const program = glProgramRef.current;
    const location = glBgColorLocationRef.current;
    if (gl && program && location) {
      gl.useProgram(program);
      gl.uniform3fv(location, new Float32Array(backgroundColor));
    }
  }, [backgroundColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }
    glRef.current = gl;

    const vertexShaderSource = `attribute vec2 aPosition; void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;
    const fragmentShaderSource = `
      precision highp float;
      uniform float iTime;
      uniform vec2 iResolution;
      uniform vec3 uBackgroundColor;
      mat2 rotate2d(float angle){ float c=cos(angle),s=sin(angle); return mat2(c,-s,s,c); }
      float variation(vec2 v1,vec2 v2,float strength,float speed){ return sin(dot(normalize(v1),normalize(v2))*strength+iTime*speed)/100.0; }
      vec3 paintCircle(vec2 uv,vec2 center,float rad,float width){
        vec2 diff = center-uv;
        float len = length(diff);
        len += variation(diff,vec2(0.,1.),5.,2.);
        len -= variation(diff,vec2(1.,0.),5.,2.);
        float circle = smoothstep(rad-width,rad,len)-smoothstep(rad,rad+width,len);
        return vec3(circle);
      }
      void main(){
        vec2 uv = gl_FragCoord.xy/iResolution.xy;
        uv.x *= 1.5; uv.x -= 0.25;
        float mask = 0.0;
        float radius = .35;
        vec2 center = vec2(.5);
        mask += paintCircle(uv,center,radius,.035).r;
        mask += paintCircle(uv,center,radius-.018,.01).r;
        mask += paintCircle(uv,center,radius+.018,.005).r;
        vec2 v=rotate2d(iTime)*uv;
        // Adapted shader colors to incorporate custom brand greens instead of pure blues
        vec3 foregroundColor=vec3(v.x * 0.1, v.y * 0.6, .4 - v.y*v.x);
        vec3 color=mix(uBackgroundColor,foregroundColor,mask);
        color=mix(color,vec3(1.),paintCircle(uv,center,radius,.003).r);
        gl_FragColor=vec4(color,1.);
      }`;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Could not create shader");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(
          gl.getShaderInfoLog(shader) || "Shader compilation error",
        );
      }
      return shader;
    };

    const program = gl.createProgram();
    if (!program) throw new Error("Could not create program");
    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    );
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    glProgramRef.current = program;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const iTimeLoc = gl.getUniformLocation(program, "iTime");
    const iResLoc = gl.getUniformLocation(program, "iResolution");
    glBgColorLocationRef.current = gl.getUniformLocation(
      program,
      "uBackgroundColor",
    );
    gl.uniform3fv(
      glBgColorLocationRef.current,
      new Float32Array(backgroundColor),
    );

    let animationFrameId: number;
    const render = (time: number) => {
      gl.uniform1f(iTimeLoc, time * 0.001);
      gl.uniform2f(iResLoc, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    animationFrameId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full block z-0 bg-background pointer-events-none"
    />
  );
};

// --- EXPORTED Building Blocks --- //

/**
 * We export the Props interface so you can easily type the data for your plans.
 */
export interface PricingCardProps {
  planName: string;
  description: string;
  price: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
  buttonVariant?: "primary" | "secondary";
  billingLabel?: string;
  key?: React.Key;
}

/**
 * We export the PricingCard component itself in case you want to use it elsewhere.
 */
export const PricingCard = ({
  planName,
  description,
  price,
  features,
  buttonText,
  isPopular = false,
  buttonVariant = "primary",
  billingLabel = "/an",
}: PricingCardProps) => {
  const cardClasses = `
    backdrop-blur-[14px] bg-gradient-to-br rounded-2xl flex-1 max-w-sm px-7 py-8 flex flex-col transition-all duration-300
    ${
      isPopular
        ? "from-white via-[#F3FBF7] to-white border-2 border-[#0F8A5F] text-brand-dark shadow-2xl scale-105 relative"
        : "bg-white border border-[#EAEAEA] text-brand-dark shadow-lg"
    }
    dark:from-slate-900/90 dark:to-slate-950/90 dark:border-white/10 dark:text-white
    ${isPopular ? "dark:from-[#0F172A]/95 dark:to-[#064E3B]/20 dark:border-[#22C55E] dark:shadow-[#22c55e11]" : ""}
  `;
  const buttonClasses = `
    mt-auto w-full py-3.5 rounded-xl font-bold text-xs transition font-sans cursor-pointer text-center
    ${
      buttonVariant === "primary"
        ? "bg-brand-green hover:bg-[#0c734e] text-white shadow-lg shadow-[#0f8a5f33]"
        : "bg-gray-100 hover:bg-gray-200 text-brand-dark border border-gray-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/20 "
    }
  `;

  return (
    <div
      className={cardClasses.trim()}
      id={`pricing-card-${planName.toLowerCase()}`}
    >
      {isPopular && (
        <div className="absolute -top-4 right-4 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest rounded-full bg-[#22C55E] text-white">
          RECOMMANDÉ
        </div>
      )}
      {/* <div className="mb-3">
        <h2 className="text-[32px] font-black tracking-[-0.03em] font-display text-brand-dark dark:text-white">
          {planName}
        </h2>
        <p className="text-[13px] text-brand-dark/70 dark:text-white/70 mt-1 font-sans leading-relaxed">
          {description}
        </p>
      </div>
      <div className="my-6 flex items-baseline gap-2">
        <span className="text-4xl font-black font-display text-brand-dark dark:text-white">
          {price} FCFA
        </span>
        <span className="text-[13px] text-brand-dark/60 dark:text-white/60 font-sans">
          {billingLabel}
        </span>
      </div>
      <div className="card-divider w-full mb-5 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.1)_50%,transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.09)_20%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.09)_80%,transparent)]"></div>
      <ul className="flex flex-col gap-3.5 text-[13px] text-brand-dark/85 dark:text-white/90 mb-6 font-sans">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0F8A5F]/10 text-[#0F8A5F] dark:bg-[#22C55E]/10 dark:text-[#22C55E] flex items-center justify-center"> */}
      <div className="mb-3">
        <h2 className="text-[32px] font-black tracking-[-0.03em] font-display text-brand-dark dark:text-white">
          {planName}
        </h2>
        <p className="text-[13px] text-gray-700 dark:text-gray-200 mt-1 font-sans leading-relaxed">
          {description}
        </p>
      </div>
      <div className="my-6 flex items-baseline gap-2">
        <span className="text-[38px] font-black font-display text-brand-dark dark:text-white">
          {price} FCFA
        </span>
        <span className="text-[13px] text-gray-500 dark:text-gray-400 font-sans">
          {billingLabel}
        </span>
      </div>
      <div className="card-divider w-full mb-5 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.1)_50%,transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.09)_20%,rgba(255,255,255,0.22)_50%,rgba(255,255,255,0.09)_80%,transparent)]"></div>
      <ul className="flex flex-col gap-3.5 text-[13px] text-gray-800 dark:text-white/90 mb-6 font-sans">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0F8A5F]/10 text-[#0F8A5F] dark:bg-[#22C55E]/10 dark:text-[#22C55E] flex items-center justify-center">
              <CheckIcon className="w-3.5 h-3.5" />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        className={buttonClasses.trim()}
        href="/login"
        // variant={buttonVariant === "primary" ? "default" : "outline"}
      >
        {buttonText}
      </Link>
    </div>
  );
};

// --- EXPORTED Customizable Page Component --- //

interface ModernPricingPageProps {
  /** The main title. Can be a string or a ReactNode for more complex content. */
  title: React.ReactNode;
  /** The subtitle text appearing below the main title. */
  subtitle: React.ReactNode;
  /** An array of plan objects that conform to PricingCardProps. */
  plans: PricingCardProps[];
  /** Whether to show the animated WebGL background. Defaults to true. */
  showAnimatedBackground?: boolean;
}

export const ModernPricingPage = ({
  title,
  subtitle,
  plans,
  showAnimatedBackground = true,
}: ModernPricingPageProps) => {
  return (
    <div className="bg-background text-foreground min-h-screen w-full overflow-x-hidden">
      {showAnimatedBackground && <ShaderCanvas />}
      <main className="relative w-full min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl mx-auto text-center mb-14">
          <h1 className="text-[48px] md:text-[64px] font-black leading-tight tracking-[-0.03em] bg-clip-text text-transparent bg-gradient-to-r from-brand-dark via-[#0F8A5F] to-emerald-700 dark:from-white dark:via-emerald-400 dark:to-emerald-500 font-display">
            {title}
          </h1>
          <p className="mt-3 text-[16px] md:text-[20px] text-brand-dark/80 dark:text-white/80 max-w-2xl mx-auto font-sans">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-8 md:gap-6 justify-center items-center w-full max-w-4xl">
          {plans.map((plan) => (
            <PricingCard key={plan.planName} {...plan} />
          ))}
        </div>
      </main>
    </div>
  );
};
