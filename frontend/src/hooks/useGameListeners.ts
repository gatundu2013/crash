import { SOCKET_EVENTS } from "@/config/socketEvents.config";
import useGameStore from "@/stores/gameStore";
import useSocketStore from "@/stores/socketStore";
import type {
  BettingPhaseData,
  EndPhaseData,
  PreparingPhaseData,
  RunningPhaseData,
  TopStakersRes,
} from "@/types/game.types";
import { useEffect } from "react";

const useGameListeners = () => {
  const socket = useSocketStore((state) => state.socket);
  const {
    handlePreparingPhase,
    handleRunningPhase,
    handleEndPhase,
    handleBettingPhase,
    handleTopStakers,
  } = useGameStore.getState();

  useEffect(() => {
    if (!socket) return;

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
      {
        eventName: SOCKET_EVENTS.LISTENERS.BROADCAST_TOP_STAKERS,
        handler: (data: TopStakersRes) => {
          handleTopStakers(data);
        },
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
