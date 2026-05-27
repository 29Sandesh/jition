import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AuthSlice {
  user: any;
  token: string | null;
  setUser: (user: any) => void;
  setToken: (token: string | null) => void;
}

interface WorkspaceSlice {
  selectedWsId: string | null;
  selectedProjectId: string | null;
  setSelectedWsId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
}

interface UISlice {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

type StoreState = AuthSlice & WorkspaceSlice & UISlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set) => ({
        // Auth slice state
        user: null,
        token: null,
        setUser: (user) => set({ user }),
        setToken: (token) => set({ token }),

        // Workspace slice state
        selectedWsId: null,
        selectedProjectId: null,
        setSelectedWsId: (id) => set({ selectedWsId: id }),
        setSelectedProjectId: (id) => set({ selectedProjectId: id }),

        // UI slice state
        theme: "light",
        toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      }),
      {
        name: "jition-store",
        // Selective Hydration: Persist user authentication, UI theme, and active workspace/project
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          theme: state.theme,
          selectedWsId: state.selectedWsId,
          selectedProjectId: state.selectedProjectId,
        }),
      }
    )
  )
);
export default useStore;
