import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Theme } from "../hooks/useTheme";
import { resolveThemeShaderColors, type RgbColor, type ThemeShaderColors } from "../lib/themeColor";
import { fragmentShader, vertexShader } from "../lib/liquidBackgroundShaders";

interface LiquidBackgroundProps {
  theme: Theme;
}

const COLOR_TRANSITION_MS = 700;
const MAX_PIXEL_RATIO = 1.5;

function lerpColor(from: RgbColor, to: RgbColor, t: number): RgbColor {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
}

export function LiquidBackground({ theme }: LiquidBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const applyThemeColorsRef = useRef<() => void>(() => {});
  const isFirstRun = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();

    const initialColors = resolveThemeShaderColors();
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorBase: { value: new THREE.Vector3(...initialColors.base) },
      uColorPrimary: { value: new THREE.Vector3(...initialColors.primary) },
      uColorSecondary: { value: new THREE.Vector3(...initialColors.secondary) },
      uColorAccent: { value: new THREE.Vector3(...initialColors.accent) },
    };

    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    let fromColors: ThemeShaderColors = initialColors;
    let toColors: ThemeShaderColors = initialColors;
    let colorTransitionStart = performance.now();

    applyThemeColorsRef.current = () => {
      fromColors = {
        base: [uniforms.uColorBase.value.x, uniforms.uColorBase.value.y, uniforms.uColorBase.value.z],
        primary: [uniforms.uColorPrimary.value.x, uniforms.uColorPrimary.value.y, uniforms.uColorPrimary.value.z],
        secondary: [
          uniforms.uColorSecondary.value.x,
          uniforms.uColorSecondary.value.y,
          uniforms.uColorSecondary.value.z,
        ],
        accent: [uniforms.uColorAccent.value.x, uniforms.uColorAccent.value.y, uniforms.uColorAccent.value.z],
      };
      toColors = resolveThemeShaderColors();
      colorTransitionStart = performance.now();
    };

    function resize() {
      const width = container?.clientWidth ?? window.innerWidth;
      const height = container?.clientHeight ?? window.innerHeight;
      renderer.setSize(width, height);
      uniforms.uResolution.value.set(width, height);
    }
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let animationFrame = 0;
    const startTime = performance.now();
    let pausedTime = 0;
    let hiddenAt = 0;

    function render(now: number) {
      animationFrame = requestAnimationFrame(render);

      if (document.hidden) {
        return;
      }

      uniforms.uTime.value = reduceMotionQuery.matches ? 0 : (now - startTime - pausedTime) / 1000;

      const colorT = Math.min(1, (now - colorTransitionStart) / COLOR_TRANSITION_MS);
      uniforms.uColorBase.value.set(...lerpColor(fromColors.base, toColors.base, colorT));
      uniforms.uColorPrimary.value.set(...lerpColor(fromColors.primary, toColors.primary, colorT));
      uniforms.uColorSecondary.value.set(...lerpColor(fromColors.secondary, toColors.secondary, colorT));
      uniforms.uColorAccent.value.set(...lerpColor(fromColors.accent, toColors.accent, colorT));

      renderer.render(scene, camera);
    }
    animationFrame = requestAnimationFrame(render);

    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt > 0) {
        pausedTime += performance.now() - hiddenAt;
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      container.removeChild(renderer.domElement);
      material.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
      // devモードのReact StrictModeはeffectをmount→cleanup→mountと即座に再実行するため、
      // GPU側のコンテキスト解放を明示的に同期させないと直後の再生成でコンテキスト作成に失敗することがある
      renderer.forceContextLoss();
    };
  }, []);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    applyThemeColorsRef.current();
  }, [theme]);

  return (
    <div
      ref={containerRef}
      data-testid="liquid-background"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20 h-full w-full overflow-hidden"
    />
  );
}
