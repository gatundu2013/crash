import type { UserI } from "@/types/user.types";
import { create } from "zustand";

interface AuthStoreI {
  isAuthenticated: boolean;
  userData: UserI | null;

  authenticate: (userData: UserI) => void;
  deAuthenticate: () => void;
}

const useAuthStore = create<AuthStoreI>((set) => ({
  isAuthenticated: false,
  userData: null,

  authenticate(userData: UserI) {
    set({ isAuthenticated: true, userData });
  },

  deAuthenticate() {
    set({ isAuthenticated: false, userData: null });
  },
}));

export default useAuthStore;
