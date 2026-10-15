import { startTransition, useActionState, useState } from "react";
import { runTimelineScript } from "../../app/commands";
import { Button } from "../controls/Button";
import { CodeEditor } from "./CodeEditor";
import { Dialog } from "./Dialog";
import { SCRIPT_EXAMPLE, SCRIPT_STORAGE_KEY } from "./script-example";
import { ScriptConsole } from "./ScriptConsole";

interface ScriptOutput {
  logs: string[];
  error: string | null;
}

export function ScriptDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState(
    () => localStorage.getItem(SCRIPT_STORAGE_KEY) ?? SCRIPT_EXAMPLE,
  );
  /** Running a script is an action: its result is the console output, `running` its pending flag. */
  const [output, runAction, running] = useActionState(
    async (_previous: ScriptOutput | null, source: string): Promise<ScriptOutput> => {
      localStorage.setItem(SCRIPT_STORAGE_KEY, source);
      const { logs, error } = await runTimelineScript(source);
      return { logs, error };
    },
    null,
  );
  const run = () => {
    if (!running) startTransition(() => runAction(code));
  };

  return (
    <Dialog
      title="Timeline script"
      wide
      onClose={onClose}
      note="⌘↵ to run"
      footer={
        <>
          <Button onClick={() => setCode(SCRIPT_EXAMPLE)}>Load example</Button>
          <Button variant="primary" onClick={run} disabled={running}>
            Run script
          </Button>
        </>
      }
    >
      <CodeEditor value={code} onChange={setCode} onRun={run} />
      {output && <ScriptConsole logs={output.logs} error={output.error} />}
    </Dialog>
  );
}
