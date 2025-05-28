import { BASE_URL } from "@/config/app.config";
import { io, type Socket } from "socket.io-client";
import { create } from "zustand";

interface SocketStoreI {
  socket: Socket | null;
  isConnected: boolean;
  connectionFailed: boolean;

  connectSocket: () => void;
}

const defaultSocketState = {
  socket: null,
  isConnected: false,
  connectionFailed: false,
};

const useSocketStore = create<SocketStoreI>((set, get) => ({
  socket: null,
  isConnected: false,
  connectionFailed: false,

  connectSocket: () => {
    const socket = get().socket;

    if (socket) return; // prevent adding extasocket

    const newSocket = io(BASE_URL);

    set({ ...defaultSocketState, isConnected: true, socket: newSocket });
  },
}));

export default useSocketStore;
