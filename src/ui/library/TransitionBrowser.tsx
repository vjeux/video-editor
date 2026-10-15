import { studioStore } from "../../store/studio";
import { Icon } from "../controls/Icon";
import { EffectCatalog } from "./EffectCatalog";
import { HeaderAction } from "./HeaderAction";
import { ImportEffectsButton } from "./ImportEffectsButton";

export function TransitionBrowser() {
  return (
    <EffectCatalog
      kind="transition"
      title="Transitions"
      actions={
        <>
          <ImportEffectsButton />
          <HeaderAction
            title="New transition in the Studio"
            onClick={() => studioStore.getState().open({ mode: "new", kind: "transition" })}
          >
            <Icon name="plus" size={14} />
          </HeaderAction>
        </>
      }
    />
  );
}
