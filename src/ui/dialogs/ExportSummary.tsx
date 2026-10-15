import * as stylex from "@stylexjs/stylex";
import { colors, fonts } from "../theme/tokens.stylex";

const styles = stylex.create({
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    margin: 0,
  },
  item: {
    minWidth: 0,
    display: "grid",
    gap: 4,
  },
  term: {
    color: colors.muted,
    fontSize: 10.5,
  },
  value: {
    margin: 0,
    fontFamily: fonts.mono,
    fontSize: { default: 12, "@media (max-width: 399px)": 10 },
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
