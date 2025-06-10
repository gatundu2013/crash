import { useEffect } from "react";
import useSocketStore from "./stores/socketStore";
import { ToastContainer } from "react-toastify";
import useAuthStatus from "./hooks/auth/useAuthStatus";
import { RouterProvider } from "react-router-dom";
import { routes } from "./routes/Index";
import useGameListeners from "./hooks/useGameListeners";

function App() {
  useAuthStatus();
  useGameListeners();

  const socket = useSocketStore((state) => state.socket);
  const connectSocket = useSocketStore((state) => state.connectSocket);

  useEffect(() => {
    connectSocket();
    return () => {
      socket?.disconnect();
    };
  }, []);

  return (
    <div className="w-full h-[100vh]">
      <ToastContainer />
      <RouterProvider router={routes} />
    </div>
  );
}

export default App;
