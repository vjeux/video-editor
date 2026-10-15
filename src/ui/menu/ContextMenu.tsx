import { contextMenuStore, useContextMenu } from "../../store/context-menu";
import { useDismiss } from "../controls/use-dismiss";
import { MenuPanel } from "./MenuPanel";

const close = () => contextMenuStore.getState().close();

/** The single right-click menu; its entries come from `app/menus.ts` and the UI's menu builders. */
export function ContextMenu() {
  const menu = useContextMenu();
  useDismiss(close, menu !== null);
  if (!menu) return null;
  return (
    <MenuPanel
      key={menu.id}
      entries={menu.entries}
      anchor={{ x: menu.x, y: menu.y, width: 0, height: 0 }}
      side="below"
      onClose={close}
    />
  );
}
