import { useStudio } from "../../store/studio";
import { studioKey } from "./studio-draft";
import { StudioDialog } from "./StudioDialog";

/** The Effect Studio modal for the studio store's current target; nothing while closed. */
export function EffectStudio({ onClose }: { onClose: () => void }) {
  const target = useStudio((s) => s.target);
  if (!target) return null;
  return <StudioDialog key={studioKey(target)} target={target} onClose={onClose} />;
}
