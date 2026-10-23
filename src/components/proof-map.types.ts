import type { ProfileMapCamera, ProfileMapPin } from "@/utils/profile";

export type ProofMapProps = {
  pins: ProfileMapPin[];
  initialCamera: ProfileMapCamera;
  onCameraMove: (camera: ProfileMapCamera) => void;
  onOpenPost: (id: string) => void;
};
