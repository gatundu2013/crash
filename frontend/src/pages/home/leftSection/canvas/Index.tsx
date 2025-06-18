import { useRef } from "react";

const Canvas = () => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div ref={parentRef} className="flex-1 min-h-0 my-2 rounded-lg">
      <canvas
        ref={canvasRef}
        className="w-full h-full border rounded-3xl border-layer-4"
      />
    </div>
  );
};

export default Canvas;
