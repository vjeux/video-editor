import type { MenuEntry } from "../../store/context-menu";
import { Icon } from "../controls/Icon";
import { isIconName } from "../controls/icon-paths";
import { Kbd } from "../controls/Kbd";
import { ListRow } from "../controls/ListRow";

type Entry = Exclude<MenuEntry, { kind: "separator" }>;

function leadFor(entry: Entry) {
  if (entry.kind === "item" && entry.checked)
    return <Icon name="check" size={14} strokeWidth={2.4} />;
  if (!entry.icon) return null;
  if (!isIconName(entry.icon)) throw new Error(`Unknown menu icon "${entry.icon}"`);
  return <Icon name={entry.icon} size={14} strokeWidth={1.9} />;
}

/** Splits "⇧⌘D" into one key cap per symbol; words such as "Space" stay whole. */
const keyCaps = (shortcut: string) => shortcut.match(/[A-Za-z]{2,}|./gu) ?? [];

export function MenuItem({
  entry,
  index,
  active,
  onHover,
  onPick,
}: {
  entry: Entry;
  index: number;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  const trail =
    entry.kind === "submenu" ? (
      <Icon name="chevronRight" size={13} strokeWidth={2.2} />
    ) : (
      entry.shortcut && keyCaps(entry.shortcut).map((key, i) => <Kbd key={i}>{key}</Kbd>)
    );
  return (
    <ListRow
      role={entry.kind === "item" && entry.checked !== undefined ? "menuitemcheckbox" : "menuitem"}
      index={index}
      label={entry.label}
      lead={leadFor(entry)}
      leadTone={entry.kind === "item" && entry.checked ? "accent" : "muted"}
      trail={trail}
      selected={entry.kind === "item" ? entry.checked : undefined}
      active={active}
      disabled={entry.disabled}
      danger={entry.kind === "item" && entry.danger}
      onHover={onHover}
      onPick={onPick}
    />
  );
}
