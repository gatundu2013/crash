import { SOCKET_EVENTS } from "@/config/socketEvents.config";
import useGameStore from "@/stores/gameStore";
import useSocketStore from "@/stores/socketStore";
import type {
  BettingPhaseData,
  EndPhaseData,
  PreparingPhaseData,
  RunningPhaseData,
} from "@/types/game.types";
import { useEffect } from "react";

const {
  handlePreparingPhase,
  handleRunningPhase,
  handleEndPhase,
  handleBettingPhase,
} = useGameStore.getState();

const gameListeners = [
  {
    eventName: SOCKET_EVENTS.LISTENERS.GAME_PHASE.PREPARING,
    handler: (data: PreparingPhaseData) =>
      handlePreparingPhase(data.hashedServerSeed),
  },
  {
    eventName: SOCKET_EVENTS.LISTENERS.GAME_PHASE.RUNNING,
    handler: (data: RunningPhaseData) =>
      handleRunningPhase(data.currentMultiplier),
  },
  {
    eventName: SOCKET_EVENTS.LISTENERS.GAME_PHASE.END,
    handler: (data: EndPhaseData) => handleEndPhase(data.finalCrashPoint),
  },
  {
    eventName: SOCKET_EVENTS.LISTENERS.GAME_PHASE.BETTING,
    handler: (data: BettingPhaseData) => handleBettingPhase(data.countDown),
  },
];

const useGameListeners = () => {
  const socket = useSocketStore((state) => state.socket);

  useEffect(() => {
    if (!socket) return;

    //setup all listeners
    gameListeners.forEach((e) => {
      socket.on(e.eventName, e.handler);
    });

    // Cleanup listeners on unmount or socket change
    return () => {
      gameListeners.forEach((e) => {
        socket.off(e.eventName);
      });
    };
  }, [socket]);
};

export default useGameListeners;
