import useGameStore from "@/stores/gameStore";
import useSocketStore from "@/stores/socketStore";
import { GamePhase } from "@/types/game.types";
import { useEffect, useRef } from "react";

const Canvas = () => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentMultiplier = useGameStore((state) => state.currentMultiplier);
  const finalMultiplier = useGameStore((state) => state.finalMultiplier);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const countDown = useGameStore((state) => state.countDown);
  const isConnected = useSocketStore((state) => state.isConnected);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const parent = parentRef.current;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    // Resize canvas to match screen DPI
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    ctx.font = "26px Inter";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const centerX = width / 2;
    const centerY = height / 2;

    if (!isConnected) {
      ctx.font = "500 18px Inter";
      ctx.letterSpacing = "1.5px";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("Connecting...", centerX, centerY);
    } else if (gamePhase === GamePhase.BETTING) {
      // Draw "Place Your Bets" label
      ctx.font = "500 17px Inter";
      ctx.letterSpacing = "0.5px";
      ctx.fillStyle = "#24ee89";
      ctx.textAlign = "center";
      ctx.fillText("Place Your Bets", centerX, centerY - 10);

      // Progress bar container
      const barWidth = 250;
      const barHeight = 20;
      const progress = countDown / 5; // 5 seconds total
      const barX = centerX - barWidth / 2;
      const barY = centerY + 10;

      // Background track with subtle border and rounded corners
      const cornerRadius = barHeight / 2; // Fully rounded corners
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, cornerRadius);
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fill();

      // Progress bar with gradient
      if (progress > 0) {
        const progressWidth = barWidth * progress;

        // Create gradient
        const gradient = ctx.createLinearGradient(
          barX,
          barY,
          barX + progressWidth,
          barY
        );
        gradient.addColorStop(0, "rgba(36, 238, 137, 0.9)");
        gradient.addColorStop(1, "rgba(36, 238, 137, 0.4)");

        // Draw progress with rounded corners - fix the boundary issue
        ctx.beginPath();

        if (progressWidth >= barWidth) {
          // If progress is complete, draw full rounded rectangle
          ctx.roundRect(barX, barY, barWidth, barHeight, cornerRadius);
        } else {
          // Draw partial progress with proper boundaries
          const rightEdge = Math.min(
            barX + progressWidth,
            barX + barWidth - cornerRadius
          );

          // Left rounded end
          ctx.arc(
            barX + cornerRadius,
            barY + cornerRadius,
            cornerRadius,
            Math.PI / 2,
            Math.PI * 1.5
          );
          // Top line
          ctx.lineTo(rightEdge, barY);
          // Right edge (straight if not at end)
          ctx.lineTo(rightEdge, barY + barHeight);
          // Bottom line
          ctx.lineTo(barX + cornerRadius, barY + barHeight);
          ctx.closePath();
        }

        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Add countdown text on top of the progress bar
      ctx.font = "600 12px Inter";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `Starts in ${countDown.toFixed(1)}s`,
        centerX,
        barY + barHeight / 2
      );
    } else if (gamePhase === GamePhase.PREPARING) {
      ctx.fillStyle = "#00bbf9";
      ctx.font = "500 17px Inter";
      ctx.letterSpacing = "1px";
      ctx.fillText("Getting Ready...", centerX, centerY);
    } else if (gamePhase === GamePhase.RUNNING) {
      ctx.font = "bold 47px Inter";
      ctx.letterSpacing = "2.5px";
      ctx.fillStyle = "white";
      // Format with consistent decimal places and padding
      const formattedMultiplier = currentMultiplier.toFixed(2);
      // Add non-breaking spaces for consistent width
      const paddedMultiplier = `  ${formattedMultiplier}x`;
      ctx.textAlign = "center";
      ctx.fillText(paddedMultiplier, centerX, centerY);
    } else if (gamePhase === GamePhase.END) {
      const textY = centerY - 15; // Adjust this value to control vertical position

      // Show Busted text
      ctx.font = "500 25px Inter";
      ctx.letterSpacing = "1.5px";
      ctx.fillStyle = "#FF2D87";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("Busted", centerX, textY - 5);

      // Show multiplier with fixed width
      ctx.font = "bold 42px Inter";
      ctx.letterSpacing = "2.5px";
      ctx.fillStyle = "#FF2D87";
      ctx.textBaseline = "top";
      ctx.fillText(`${finalMultiplier.toFixed(2)}x`, centerX, textY + 5);
    }
  };

  useEffect(() => {
    drawCanvas(); // initial draw

    const handleResize = () => {
      drawCanvas(); // redraw on window resize
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [gamePhase]);

  // Redraw on multiplier or phase change
  useEffect(() => {
    drawCanvas();
  }, [currentMultiplier, gamePhase, countDown]);

  return (
    <div ref={parentRef} className="flex-1 min-h-0 my-2 rounded-lg">
      <canvas
        ref={canvasRef}
        className="w-full h-full border rounded-3xl border-layer-5"
      />
    </div>
  );
};

export default Canvas;
