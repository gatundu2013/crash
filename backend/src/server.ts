import { MultiplierGenerator } from "./services/game/multiplierGenerator";

const multiplerData = new MultiplierGenerator({
  clientSeed: "briangatundu",
});

console.log(multiplerData.generateGameResults());
