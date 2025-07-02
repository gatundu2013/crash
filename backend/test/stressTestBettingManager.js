"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stressTestBettingManager = void 0;
const bettingManager_1 = require("../src/services/game/gameEngine/bettingManager");
const socket = {
    emit: () => { },
    connected: false, // or true if you want to simulate active connection
};
const bettingPayload = {
    autoCashoutMultiplier: null,
    clientSeed: "gatundu",
    stake: 10,
    storeId: "33",
    userId: "c110e642-41c1-48a9-b481-6a3030282069",
    username: "brian",
};
const stressTestBettingManager = () => {
    console.log("called");
    for (let i = 0; i < 1000; i++) {
        bettingManager_1.bettingManager.stageBet({
            payload: bettingPayload,
            socket,
        });
    }
};
exports.stressTestBettingManager = stressTestBettingManager;
