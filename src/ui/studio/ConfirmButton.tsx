import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../controls/Button";

const DISARM_MS = 3000;

/**
 * A button that asks for a second click ("Click again to …") before acting.
 * With `needsConfirm` false it acts on the first click.
 */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  needsConfirm = true,
  variant = "default",
  title,
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  needsConfirm?: boolean;
  variant?: "default" | "danger";
  title?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), DISARM_MS);
    return () => clearTimeout(id);
  }, [armed]);

  return (
    <Button
      variant={armed ? "danger" : variant}
      title={title}
      onClick={() => {
        if (armed || !needsConfirm) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
