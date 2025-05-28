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

    socket.on("t", (data) => setCurrentMultiplier(data));

    return () => {
      socket.off("t"); // Remove all listeners for the "t" event
    };
  }, [socket]); // Only re-run if socket changes

  return (
    <div className="text-red-500 w-[100vw]  h-[100vh] relative">
      <h1 className="text-2xl text-center absolute top-[50%] translate-y-[-50%] right-[50%] ">
        {currentMultiplier.toFixed(2)}
      </h1>
    </div>
  );
}

export default App;
