import { create } from "zustand";

interface ChatStoreI {
  chatsAreShown: boolean;
  toggleChats: () => void;
}

const useChatStore = create<ChatStoreI>((set) => ({
  chatsAreShown: false,
  toggleChats() {
    set((state) => ({ chatsAreShown: !state.chatsAreShown }));
  },
}));

export default useChatStore;
