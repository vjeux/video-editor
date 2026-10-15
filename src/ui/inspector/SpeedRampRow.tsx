import { setSpeedRamp } from "../../app/audio-effects";
import { SPEED_RAMPS } from "../../core/speed-ramps";
import type { MediaClip } from "../../core/types";
import { Row } from "../controls/Row";
import { Select } from "../controls/Select";

/** Velocity curve picker: the clip keeps its footage, only the pacing changes. */
export function SpeedRampRow({ clip }: { clip: MediaClip }) {
  return (
    <Row label="Ramp" wide>
      <Select
        label="Speed ramp"
        value={clip.speedRamp ?? ""}
        onChange={(id) => setSpeedRamp(clip.id, id || null)}
      >
        <option value="">None (constant)</option>
        {Object.values(SPEED_RAMPS).map((ramp) => (
          <option key={ramp.id} value={ramp.id}>
            {ramp.name}
          </option>
        ))}
      </Select>
    </Row>
  );
}
