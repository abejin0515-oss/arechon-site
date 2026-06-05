// Public surface for the sound-design technique. Import from "@/components/techniques/sound".
// Every module here is a client module ('use client'); none of this is reachable from the server
// graph, so howler stays out of server bundles.

export { SoundProvider } from "./SoundProvider";
export type { SoundProviderProps, SoundContextValue } from "./SoundProvider";
export { useSound } from "./useSound";
export { SoundToggle } from "./SoundToggle";
export type { SoundToggleProps } from "./SoundToggle";
export { SoundDelegation } from "./SoundDelegation";
export {
  SOUND_REGISTRY,
  ALL_SOUND_NAMES,
  type SoundName,
  type SoundDef,
} from "./sounds";
