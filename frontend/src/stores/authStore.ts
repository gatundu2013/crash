import type { UserI } from "@/types/user.types";
import { create } from "zustand";

interface AuthStoreI {
  isAuthenticated: boolean;
  userData: UserI | null;

  authenticate: (userData: UserI) => void;
  deAuthenticate: () => void;

  updateUserData: (newData: Partial<UserI>) => void;
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

  updateUserData(newData: Partial<UserI>) {
    set((state) => ({
      userData: state.userData
        ? { ...state.userData, ...newData }
        : state.userData,
    }));
  },
}));

export default useAuthStore;
