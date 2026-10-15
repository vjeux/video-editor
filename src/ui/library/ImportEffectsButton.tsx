import { useRef } from "react";
import { importEffectFiles } from "../../app/effects";
import { Icon } from "../controls/Icon";
import { HeaderAction } from "./HeaderAction";

const ACCEPTED = ".glsl,.frag,.fs,.cube,.json";

/** Imports GLSL shaders, .cube LUTs and effect packs into the project. */
export function ImportEffectsButton() {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <HeaderAction
        title="Import shaders, LUTs or effect packs"
        onClick={() => input.current?.click()}
      >
        <Icon name="upload" size={14} />
      </HeaderAction>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={ACCEPTED}
        onChange={(e) => {
          if (e.target.files) void importEffectFiles([...e.target.files]);
          e.target.value = "";
        }}
      />
    </>
  );
}
