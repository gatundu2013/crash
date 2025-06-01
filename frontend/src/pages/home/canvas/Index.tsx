import { useEffect, useRef } from "react";

const CanvasComponent = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = parentRef.current;

    if (!canvas || !parent) return;

    return () => {};
  }, []);

  return (
    <div
      ref={parentRef}
      className="w-[95%] mx-auto h-[350px] relative my-2 bg-layer-4 rounded-lg"
    >
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 right-0 bottom-0"
      />
    </div>
  );
};

export default CanvasComponent;
