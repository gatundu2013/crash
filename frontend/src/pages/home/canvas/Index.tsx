import useGameStore from "@/stores/gameStore";
import { GamePhase } from "@/types/game.types";
import { useEffect, useRef } from "react";

const CanvasComponent = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const tRef = useRef<number>(0);
  const prevGamePhaseRef = useRef<GamePhase>(GamePhase.PREPARING);

  const currentMultiplier = useGameStore((state) => state.currentMultiplier);
  const countDown = useGameStore((state) => state.countDown);
  const gamePhase = useGameStore((state) => state.gamePhase);

  const quadraticBezier = (t: number, p0: number, p1: number, p2: number) => {
    return Math.pow(1 - t, 2) * p0 + 2 * (1 - t) * t * p1 + Math.pow(t, 2) * p2;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = parentRef.current;

    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";

      ctx.scale(dpr, dpr);
    };

    const renderBezierCurve = (rect: DOMRect, progress: number) => {
      const padding = 50;
      const points = [
        { x: padding, y: rect.height - padding },
        { x: rect.width / 2, y: rect.height / 4 },
        { x: rect.width - padding, y: padding },
      ];

      // Draw control lines (faint)
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw control points
      const colors = ["#ff595e", "#ffca3a", "#8ac926"];
      points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = colors[index];
        ctx.fill();
      });

      // Draw animated bezier curve
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 0; i <= progress; i += 0.001) {
        const x = quadraticBezier(i, points[0].x, points[1].x, points[2].x);
        const y = quadraticBezier(i, points[0].y, points[1].y, points[2].y);
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw current position dot
      if (progress > 0) {
        const currentX = quadraticBezier(
          progress,
          points[0].x,
          points[1].x,
          points[2].x
        );
        const currentY = quadraticBezier(
          progress,
          points[0].y,
          points[1].y,
          points[2].y
        );

        ctx.beginPath();
        ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };

    const renderGamePhases = () => {
      const rect = parent.getBoundingClientRect();

      ctx.font = "30px Inter";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      switch (gamePhase) {
        case GamePhase.PREPARING:
          ctx.fillText("Preparing game...", rect.width / 2, rect.height / 2);
          break;
        case GamePhase.BETTING:
          ctx.fillText(
            `Betting: ${countDown?.toFixed(1)}s`,
            rect.width / 2,
            rect.height / 2
          );
          break;
        case GamePhase.RUNNING:
          // Render bezier curve animation
          renderBezierCurve(rect, tRef.current);

          // Show multiplier on top
          ctx.font = "40px Inter";
          ctx.fillStyle = "#00ff88";
          ctx.fillText(`${currentMultiplier.toFixed(2)}x`, rect.width / 2, 60);

          // Animate progress based on multiplier (you can adjust this logic)
          tRef.current += 0.005; // Adjust speed as needed
          if (tRef.current > 1) tRef.current = 1;
          break;
        case GamePhase.END:
          // Show final curve state
          renderBezierCurve(rect, 1);

          ctx.font = "30px Inter";
          ctx.fillStyle = "red";
          ctx.fillText(
            `Game ended at ${currentMultiplier?.toFixed(2)}x`,
            rect.width / 2,
            rect.height - 40
          );
          break;
        case GamePhase.ERROR:
          ctx.fillStyle = "red";
          ctx.fillText("An error occurred", rect.width / 2, rect.height / 2);
          break;
      }
    };

    const animate = () => {
      const rect = parent.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      renderGamePhases();
      animationRef.current = requestAnimationFrame(animate);
    };

    // Reset animation progress only when game phase changes to RUNNING
    if (
      gamePhase === GamePhase.RUNNING &&
      prevGamePhaseRef.current !== GamePhase.RUNNING
    ) {
      tRef.current = 0;
    }
    prevGamePhaseRef.current = gamePhase;

    resizeCanvas();
    animate();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gamePhase, currentMultiplier, countDown]);

  return (
    <div
      ref={parentRef}
      className="mx-auto h-[350px] relative my-2 rounded-lg bg-gray-900"
    >
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 right-0 bottom-0 border border-red-500"
      />
    </div>
  );
};

export default CanvasComponent;
