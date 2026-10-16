import * as stylex from "@stylexjs/stylex";
import { reportError } from "../../app/errors";
import { reconnectMedia } from "../../app/session";
import { useMedia } from "../../store";
import { Button } from "../controls/Button";
import { Icon } from "../controls/Icon";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  banner: {
    marginInline: 12,
    marginBottom: 10,
    padding: 10,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 8,
    rowGap: 8,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    color: colors.text,
    fontSize: 11,
    lineHeight: 1.5,
  },
  text: { flexGrow: 1, flexBasis: 120, minWidth: 0 },
});

/**
 * Linked files are read in place; after a reload the browser may want the
 * user's permission again. One click asks for all of them.
 */
export function ReconnectBanner() {
  const offline = useMedia(
    (s) => Object.values(s.assets).filter((a) => a.status === "offline").length,
  );
  if (offline === 0) return null;
  return (
    <div role="status" {...stylex.props(styles.banner)}>
      <Icon name="lock" size={14} />
      <span {...stylex.props(styles.text)}>
        {offline === 1 ? "1 linked file needs" : `${offline} linked files need`} permission again.
      </span>
      <Button onClick={() => void reconnectMedia().catch(reportError)}>Reconnect</Button>
    </div>
  );
}
