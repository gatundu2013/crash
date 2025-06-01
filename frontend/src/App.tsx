import { useEffect } from "react";
import useSocketStore from "./stores/socketStore";
import { ToastContainer } from "react-toastify";
import useAuthStatus from "./hooks/auth/useAuthStatus";
import { RouterProvider } from "react-router-dom";
import { routes } from "./routes/Index";
import useGameStore from "./stores/gameStore";

function App() {
  useAuthStatus();

  const socket = useSocketStore((state) => state.socket);
  const connectSocket = useSocketStore((state) => state.connectSocket);
  const setCurrentMultiplier = useGameStore(
    (state) => state.setCurrentMultiplier
  );

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
    <div className="w-full h-[100vh]">
      <ToastContainer />
      <RouterProvider router={routes} />
    </div>
  );
}

export default App;
