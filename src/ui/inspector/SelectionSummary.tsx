import * as stylex from "@stylexjs/stylex";
import { colors } from "../theme/tokens.stylex";
import { Group } from "./Group";

const styles = stylex.create({
  hint: { margin: 0, color: colors.faint, fontSize: 11.5, lineHeight: 1.6 },
});

export function SelectionSummary({ count }: { count: number }) {
  return (
    <Group title={`${count} clips selected`}>
      <p {...stylex.props(styles.hint)}>
        Drag any of them to move the group, press S to split them at the playhead, or ⌫ to delete.
      </p>
    </Group>
  );
}
