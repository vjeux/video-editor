import { useState } from "react";
import { runTimelineScript } from "../../app/commands";
import { Button } from "../controls/Button";
import { CodeEditor } from "./CodeEditor";
import { Dialog } from "./Dialog";
import { SCRIPT_EXAMPLE, SCRIPT_STORAGE_KEY } from "./script-example";
import { ScriptConsole } from "./ScriptConsole";

export function ScriptDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState(
    () => localStorage.getItem(SCRIPT_STORAGE_KEY) ?? SCRIPT_EXAMPLE,
  );
  const [output, setOutput] = useState<{ logs: string[]; error: string | null } | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (running) return;
    localStorage.setItem(SCRIPT_STORAGE_KEY, code);
    setRunning(true);
    try {
      const { logs, error } = await runTimelineScript(code);
      setOutput({ logs, error });
    } finally {
      setRunning(false);
    }
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
          <Button variant="primary" onClick={() => void run()} disabled={running}>
            Run script
          </Button>
        </>
      }
    >
      <CodeEditor value={code} onChange={setCode} onRun={() => void run()} />
      {output && <ScriptConsole logs={output.logs} error={output.error} />}
    </Dialog>
  );
}
