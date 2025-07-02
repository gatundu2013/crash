import type { UserRes } from "@/types/shared/api/authTypes";
import generateClientSeed from "@/utils/generateClientSeed";
import { create } from "zustand";

interface AuthStoreI {
  isAuthenticated: boolean;
  userData: UserRes | null;
  clientSeed: string;

  authenticate: (userData: UserRes) => void;
  deAuthenticate: () => void;
  updateUserData: (newData: Partial<UserRes>) => void;
  setClientSeed: (newSeed: string) => void;
}

const useAuthStore = create<AuthStoreI>((set) => ({
  isAuthenticated: false,
  userData: null,
  clientSeed: generateClientSeed(),

  authenticate(userData: UserRes) {
    set({ isAuthenticated: true, userData });
  },

  deAuthenticate() {
    set({ isAuthenticated: false, userData: null });
  },

  updateUserData(newData: Partial<UserRes>) {
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
