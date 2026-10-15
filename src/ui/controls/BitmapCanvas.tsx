import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
});

/** Paints a decoded ImageBitmap (poster, thumbnail) filling its positioned parent. */
export function BitmapCanvas({ bitmap }: { bitmap: ImageBitmap | undefined }) {
  return (
    <canvas
      ref={(canvas) => {
        if (!canvas || !bitmap) return;
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
      }}
      {...stylex.props(styles.canvas)}
    />
  );
}
