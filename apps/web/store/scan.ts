import { create } from 'zustand';

export type Pose = 'stand' | 'lean';

interface ScanState {
  photos: Record<Pose, Blob[]>;
  addPhoto: (pose: Pose, blob: Blob) => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  photos: { stand: [], lean: [] },
  addPhoto: (pose, blob) =>
    set((state) => ({
      photos: {
        ...state.photos,
        [pose]: blob.size <= 2 * 1024 * 1024
          ? [...state.photos[pose], blob]
          : state.photos[pose],
      },
    })),
  reset: () => set({ photos: { stand: [], lean: [] } }),
}));
