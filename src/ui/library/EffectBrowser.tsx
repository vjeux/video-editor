import { addAdjustmentLayer } from "../../app/effects";
import { studioStore } from "../../store/studio";
import { Icon } from "../controls/Icon";
import { EffectCatalog } from "./EffectCatalog";
import { HeaderAction } from "./HeaderAction";
import { ImportEffectsButton } from "./ImportEffectsButton";
import { LayersIcon } from "./LayersIcon";

export function EffectBrowser() {
  return (
    <EffectCatalog
      kind="effect"
      title="Effects"
      actions={
        <>
          <ImportEffectsButton />
          <HeaderAction
            title="New effect in the Studio"
            onClick={() => studioStore.getState().open({ mode: "new", kind: "effect" })}
          >
            <Icon name="plus" size={14} />
          </HeaderAction>
          <HeaderAction
            title="Add an adjustment layer at the playhead"
            onClick={() => addAdjustmentLayer()}
          >
            <LayersIcon size={14} />
          </HeaderAction>
        </>
      }
    />
  );
}
