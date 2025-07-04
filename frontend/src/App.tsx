import { useEffect } from "react";
import useSocketStore from "./stores/socketStore";
import { ToastContainer } from "react-toastify";
import useAuthStatus from "./hooks/auth/useAuthStatus";
import { RouterProvider } from "react-router-dom";
import { routes } from "./routes/Index";
import useGameListeners from "./hooks/useGameListeners";
import { Analytics } from "@vercel/analytics/next";

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
    <div className="w-[100vw] h-[100vh] overflow-x-hidden">
      <ToastContainer
        theme="dark"
        position="top-center"
        hideProgressBar
        icon={false}
        pauseOnFocusLoss={false}
        draggable
        className={"cursor-pointer"}
      />
      <Analytics />
      <RouterProvider router={routes} />
    </div>
  );
}

export default App;
