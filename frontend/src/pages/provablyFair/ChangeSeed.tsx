import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import useAuthStore from "@/stores/authStore";
import { useState, type ChangeEvent } from "react";
import generateClientSeed from "@/utils/generateClientSeed";
import { GAME_CONFIG } from "@/config/game.config";

const ChangeSeed = () => {
  const setClientSeed = useAuthStore((state) => state.setClientSeed);
  const [newClientSeed, setNewClientSeed] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleNewClientSeedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9]*$/.test(value)) {
      setNewClientSeed(value);
    }
  };

  const handleGenerateRandomSeed = () => {
    setNewClientSeed(generateClientSeed());
  };

  const handleSave = () => {
    if (
      newClientSeed.length < GAME_CONFIG.MIN_SEED_LENGTH ||
      newClientSeed.length > GAME_CONFIG.MAX_SEED_LENGTH
    ) {
      return;
    }

    setClientSeed(newClientSeed);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="h-0 py-3 bg-green-1 text-black text-sm">
          CHANGE
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-layer-3 border-0 w-[400px] py-7 border-layer-4">
        <DialogHeader className="hidden">
          <DialogTitle></DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>

        <div>
          <h4 className="mb-1 text-center text-white/90 text-sm font-medium">
            Enter new client seed
          </h4>
          <Input
            onChange={handleNewClientSeedChange}
            value={newClientSeed}
            placeholder="Alphanumeric only"
          />
          <h4 className="text-xs flex gap-2 text-green-1 font-medium mt-1">
            <span>Min-{GAME_CONFIG.MIN_SEED_LENGTH}</span>
            <span>Max-{GAME_CONFIG.MAX_SEED_LENGTH}</span>
          </h4>
        </div>

        <div className="flex justify-center mt-1">
          <Button
            className="w-32 bg-orange-1 border border-white/50"
            onClick={handleGenerateRandomSeed}
          >
            Random
          </Button>
        </div>

        <div className="flex justify-center gap-3">
          <Button
            className="w-32 border border-white/50"
            onClick={handleSave}
            disabled={
              newClientSeed.length < GAME_CONFIG.MIN_SEED_LENGTH ||
              newClientSeed.length > GAME_CONFIG.MAX_SEED_LENGTH
            }
          >
            SAVE
          </Button>
          <Button
            className="w-32 bg-red-1 text-white border border-white/50 font-semibold"
            onClick={handleCancel}
          >
            CANCEL
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeSeed;
