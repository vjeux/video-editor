import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "../theme/tokens.stylex";
import { Icon } from "./Icon";
import type { IconName } from "./icon-paths";

const styles = stylex.create({
  header: {
    height: 44,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBlock: 0,
    paddingInline: 14,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    backgroundColor: colors.panel,
  },
  title: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  icon: { color: colors.faint },
  aside: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
});

export function PanelHeader({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: IconName;
  children?: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.header)}>
      <h3 {...stylex.props(styles.title)}>
        {icon && (
          <span {...stylex.props(styles.icon)}>
            <Icon name={icon} size={15} />
          </span>
        )}
        {title}
      </h3>
      {children && <div {...stylex.props(styles.aside)}>{children}</div>}
    </div>
  );
}
