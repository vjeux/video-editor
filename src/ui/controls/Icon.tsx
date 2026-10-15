import { ICONS, type IconName } from "./icon-paths";

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      aria-hidden
      {...ICONS[name]}
    />
  );
}
