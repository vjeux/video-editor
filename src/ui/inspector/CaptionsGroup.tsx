import * as stylex from "@stylexjs/stylex";
import type { Id } from "../../core/types";
import { captionsStore } from "../../store/captions";
import { Button } from "../controls/Button";
import { colors } from "../theme/tokens.stylex";
import { Group } from "./Group";

const styles = stylex.create({
  hint: { margin: 0, marginBottom: 8, color: colors.faint, fontSize: 11.5, lineHeight: 1.5 },
});

/** Entry point to auto-captions for a clip with speech. */
export function CaptionsGroup({ clipId }: { clipId: Id }) {
  return (
    <Group title="Captions">
      <p {...stylex.props(styles.hint)}>
        Transcribe the speech into timed captions, word by word, on this device.
      </p>
      <Button onClick={() => captionsStore.getState().open(clipId)}>Generate captions…</Button>
    </Group>
  );
}
