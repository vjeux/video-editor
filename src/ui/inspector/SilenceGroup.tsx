import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useTransition } from "react";
import { reportError } from "../../app/errors";
import {
  clearSilences,
  findSilences,
  previewSilences,
  removePreviewedSilences,
} from "../../app/silences";
import { spansLength, type SilenceOptions } from "../../core/silences";
import type { MediaClip } from "../../core/types";
import { silenceStore, useSilences } from "../../store/silences";
import { Button } from "../controls/Button";
import { SliderRow } from "../controls/SliderRow";
import { colors } from "../theme/tokens.stylex";
import { Group } from "./Group";

const styles = stylex.create({
  hint: { margin: 0, marginBottom: 8, color: colors.faint, fontSize: 11.5, lineHeight: 1.5 },
  summary: { margin: 0, marginBlock: 8, color: colors.muted, fontSize: 12 },
  count: { color: colors.text, fontWeight: 600 },
  actions: { display: "flex", gap: 8 },
});

/**
 * Finds pauses in the clip's audio, previews them on the timeline and cuts
 * them out as jump cuts. The sliders re-detect live.
 */
export function SilenceGroup({ clip }: { clip: MediaClip }) {
  const preview = useSilences((s) => (s.preview?.clipId === clip.id ? s.preview : null));
  const [finding, startFinding] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const previewing = preview !== null;
  // Started from the timeline's context menu, the panel may be scrolled out of view.
  useEffect(() => {
    if (previewing) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [previewing]);
  // The preview belongs to this clip's panel: leaving it (another selection) dismisses it.
  useEffect(
    () => () => {
      if (silenceStore.getState().preview?.clipId === clip.id) clearSilences();
    },
    [clip.id],
  );

  const detect = (options: SilenceOptions) =>
    void previewSilences(clip.id, options).catch(reportError);

  if (!preview) {
    return (
      <Group title="Silences">
        <p {...stylex.props(styles.hint)}>
          Find the pauses in this clip and cut them out as jump cuts.
        </p>
        <Button
          disabled={finding}
          onClick={() =>
            startFinding(async () => {
              try {
                await findSilences(clip.id);
              } catch (error) {
                reportError(error);
              }
            })
          }
        >
          {finding ? "Listening…" : "Find silences"}
        </Button>
      </Group>
    );
  }

  const { options, spans } = preview;
  return (
    <div ref={ref}>
      <Group title="Silences">
        <SliderRow
          label="Threshold"
          value={options.threshold}
          min={-70}
          max={-15}
          step={1}
          suffix="dB"
          onChange={(threshold) => detect({ ...options, threshold })}
        />
        <SliderRow
          label="Min pause"
          value={options.minSilence}
          min={0.1}
          max={2}
          step={0.05}
          precision={2}
          suffix="s"
          onChange={(minSilence) => detect({ ...options, minSilence })}
        />
        <SliderRow
          label="Padding"
          value={options.padding}
          min={0}
          max={0.5}
          step={0.01}
          precision={2}
          suffix="s"
          onChange={(padding) => detect({ ...options, padding })}
        />
        <p {...stylex.props(styles.summary)}>
          {spans.length > 0 ? (
            <>
              <span {...stylex.props(styles.count)}>{spans.length} pauses</span> ·{" "}
              {spansLength(spans).toFixed(1)}s shorter
            </>
          ) : (
            "No pauses at these settings"
          )}
        </p>
        <div {...stylex.props(styles.actions)}>
          <Button
            variant="primary"
            disabled={spans.length === 0}
            onClick={() => {
              try {
                removePreviewedSilences();
              } catch (error) {
                reportError(error);
              }
            }}
          >
            Remove {spans.length} pauses
          </Button>
          <Button onClick={clearSilences}>Cancel</Button>
        </div>
      </Group>
    </div>
  );
}
