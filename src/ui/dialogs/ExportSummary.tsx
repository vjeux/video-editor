import * as stylex from "@stylexjs/stylex";
import { colors, fonts, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    margin: 0,
  },
  item: {
    minWidth: 0,
    paddingBlock: 8,
    paddingInline: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  term: {
    color: colors.faint,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  value: {
    margin: 0,
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
});

export function ExportSummary({ items }: { items: readonly { label: string; value: string }[] }) {
  return (
    <dl {...stylex.props(styles.summary)}>
      {items.map((item) => (
        <div key={item.label} {...stylex.props(styles.item)}>
          <dt {...stylex.props(styles.term)}>{item.label}</dt>
          <dd {...stylex.props(styles.value)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
