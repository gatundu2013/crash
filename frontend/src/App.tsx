import { useEffect, useState } from "react";
import useSocketStore from "./stores/socketStore";
import MainLayout from "./layouts/MainLayout";
import SignUp from "./pages/auth/SignUp";
import { ToastContainer } from "react-toastify";
import SignIn from "./pages/auth/SignIn";
import useAuthStatus from "./hooks/auth/useAuthStatus";

function App() {
  useAuthStatus();

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
    <div className="w-full h-[100vh]">
      <ToastContainer />
      <MainLayout
        body={
          <div className="w-full h-full flex justify-center">
            {/* <SignIn /> */}
            {/* <SignUp /> */}
            <div className="absolute bottom-4 right-4">
              <h2>Current Multiplier: {currentMultiplier.toFixed(2)}</h2>
            </div>
          </div>
        }
        sidebarContent={<div>chats here</div>}
      />
    </div>
  );
}

export default App;
