import type { UserI } from "@/types/user.types";
import generateClientSeed from "@/utils/generateClientSeed";
import { create } from "zustand";

interface AuthStoreI {
  isAuthenticated: boolean;
  userData: UserI | null;
  clientSeed: string;

  authenticate: (userData: UserI) => void;
  deAuthenticate: () => void;

  updateUserData: (newData: Partial<UserI>) => void;

  setClientSeed: (newSeed: string) => void;
}

const useAuthStore = create<AuthStoreI>((set) => ({
  isAuthenticated: false,
  userData: null,
  clientSeed: generateClientSeed(),

  authenticate(userData: UserI) {
    set({ isAuthenticated: true, userData });
  },

  deAuthenticate() {
    set({ isAuthenticated: false, userData: null });
  },

  updateUserData(newData: Partial<UserI>) {
    set((state) => ({
      userData: state.userData
        ? { ...state.userData, ...newData }
        : state.userData,
    }));
  },

  setClientSeed(newClientSeed: string) {
    set({ clientSeed: newClientSeed });
  },
}));

export default useAuthStore;
