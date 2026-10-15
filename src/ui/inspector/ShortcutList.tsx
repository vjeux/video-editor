import * as stylex from "@stylexjs/stylex";
import { Fragment } from "react";
import { Kbd } from "../controls/Kbd";
import { colors } from "../theme/tokens.stylex";
import { SHORTCUTS } from "./options";

const styles = stylex.create({
  list: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    rowGap: 6,
    columnGap: 10,
    margin: 0,
    fontSize: 11.5,
    color: colors.muted,
  },
  keys: { margin: 0, justifySelf: "end" },
});

export function ShortcutList() {
  return (
    <dl {...stylex.props(styles.list)}>
      {SHORTCUTS.map(([what, keys]) => (
        <Fragment key={what}>
          <dt>{what}</dt>
          <dd {...stylex.props(styles.keys)}>
            <Kbd>{keys}</Kbd>
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}
