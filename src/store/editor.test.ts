import { beforeEach, describe, expect, it } from "vite-plus/test";
import { emptyProject, videoAsset, videoClip, withClips } from "../core/fixtures.test-utils";
import { createEditorStore, type EditorStore } from "./editor";

let store: EditorStore;
const project = () => store.getState().project;

beforeEach(() => {
  store = createEditorStore(withClips(emptyProject(), videoClip("a", 0, 4), videoClip("b", 4, 4)));
});

describe("history", () => {
  it("undoes and redoes committed changes", () => {
    store.getState().commit((p) => ({ ...p, name: "Renamed" }));
    expect(project().name).toBe("Renamed");
    store.getState().undo();
    expect(project().name).toBe("Test");
    store.getState().redo();
    expect(project().name).toBe("Renamed");
  });

  it("drops the redo stack on a new commit", () => {
    store.getState().commit((p) => ({ ...p, name: "One" }));
    store.getState().undo();
    store.getState().commit((p) => ({ ...p, name: "Two" }));
    store.getState().redo();
    expect(project().name).toBe("Two");
  });

  it("coalesces consecutive commits sharing a key into one undo step", () => {
    store.getState().commit((p) => ({ ...p, name: "x" }), { coalesce: "slider" });
    store.getState().commit((p) => ({ ...p, name: "xy" }), { coalesce: "slider" });
    store.getState().commit((p) => ({ ...p, name: "xyz" }), { coalesce: "slider" });
    store.getState().undo();
    expect(project().name).toBe("Test");
  });

  it("does not record commits that change nothing", () => {
    store.getState().commit((p) => p);
    expect(store.getState().past).toHaveLength(0);
  });

  it("ignores undo with empty history", () => {
    const before = project();
    store.getState().undo();
    expect(project()).toBe(before);
  });
});

describe("selection", () => {
  it("prunes selected clips that no longer exist", () => {
    store.getState().select(["a", "b"]);
    store.getState().commit((p) => {
      const { a: _a, ...clips } = p.clips;
      return { ...p, clips };
    });
    expect(store.getState().selection).toEqual(["b"]);
  });
});

describe("load", () => {
  it("replaces the project and clears history", () => {
    store.getState().commit((p) => ({ ...p, name: "Edited" }));
    store
      .getState()
      .load({ ...emptyProject(), name: "Loaded", assets: { [videoAsset.id]: videoAsset } });
    expect(project().name).toBe("Loaded");
    expect(store.getState().past).toHaveLength(0);
  });
});
