import { SOCKET_EVENTS } from "@/config/socketEvents.config";
import useGameStore from "@/stores/gameStore";
import useSocketStore from "@/stores/socketStore";
import { useEffect } from "react";

const useGameListeners = () => {
  const socket = useSocketStore((state) => state.socket);
  const {
    handlePreparingPhase,
    handleRunningPhase,
    handleEndPhase,
    handleBettingPhase,
    handleBroadcastSuccessfulBets,
    handleBroadcastSuccessfulCashouts,
    handleBroadcastHashedServerSeed,
    onConnectData,
  } = useGameStore.getState();

  useEffect(() => {
    if (!socket) return;

    const gameListeners = [
      {
        eventName: SOCKET_EVENTS.LISTENERS.GAME_PHASE.PREPARING,
        handler: handlePreparingPhase,
      },
      {
        eventName: SOCKET_EVENTS.LISTENERS.GAME_PHASE.RUNNING,
        handler: handleRunningPhase,
      },
      {
        eventName: SOCKET_EVENTS.LISTENERS.GAME_PHASE.END,
        handler: handleEndPhase,
      },
      {
        eventName: SOCKET_EVENTS.LISTENERS.GAME_PHASE.BETTING,
        handler: handleBettingPhase,
      },
      {
        eventName: SOCKET_EVENTS.LISTENERS.BROADCAST_SUCCESSFUL_BETS,
        handler: handleBroadcastSuccessfulBets,
      },
      {
        eventName: SOCKET_EVENTS.LISTENERS.BROADCAST_SUCCESSFUL_CASHOUTS,
        handler: handleBroadcastSuccessfulCashouts,
      },
      {
        eventName: SOCKET_EVENTS.LISTENERS.BROADCAST_HASHED_SERVER_SEED,
        handler: handleBroadcastHashedServerSeed,
      },
      {
        eventName: SOCKET_EVENTS.LISTENERS.ON_CONNECT_DATA,
        handler: onConnectData,
      },
    ];

    // Setup all listeners
    gameListeners.forEach((e) => {
      socket.on(e.eventName, e.handler);
    });

    // Cleanup all listeners
    return () => {
      gameListeners.forEach((e) => {
        socket.off(e.eventName, e.handler);
      });
    };
  }, [socket]);
};

export default useGameListeners;
