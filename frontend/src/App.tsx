import { useEffect, useState } from "react";
import useSocketStore from "./stores/socketStore";

function App() {
  const socket = useSocketStore((state) => state.socket);
  const connectSocket = useSocketStore((state) => state.connectSocket);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);

  useEffect(() => {
    connectSocket();
    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    console.log(socket);

    socket.on("broadcastCurrentMultiplier", (data) =>
      setCurrentMultiplier(data.multiplier)
    );

    return () => {
      socket.off("broadcastCurrentMultiplier"); // Remove all listeners for the "t" event
    };
  }, [socket]); // Only re-run if socket changes

  return (
    <div className="w-full  h-[100vh]">
      <div className="flex">
        <div className="w-full relative">
          <div className="absolute top-0 left-0 right-0 bg-layer-3 h-[64px] flex items-center justify-between px-10">
            <div>Logo</div>
            <div>Dynamic depeding on auth</div>
          </div>
          <div className="mt-[64px] h-[calc(100vh-64px)]">
            <h1>Body</h1>
            <h2>{currentMultiplier.toFixed(2)}</h2>
          </div>
          <div>Footer</div>
        </div>
        <div className="w-[350px]">chats</div>
      </div>
    </div>
  );
}

export default App;
