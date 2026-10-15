# Cutline project files (version 1)

The **☰ menu → Save project** downloads a self-contained `.cutline` file.
**Open** accepts these files as well as regular media. Saving is separate from
the browser's automatic device save, and Export still renders a finished video.
Every source file in the media bin is included, even if unused on the timeline.
Titles, tracks, markers, custom shaders, LUTs and all edit settings are included.
Bundled application fonts are referenced by name. Undo history, preview caches
and interface preferences are not included.

The format keeps media binary and uncompressed. Most video/audio sources are
already compressed; retaining Blob slices avoids base64 overhead and avoids
reading entire videos into JavaScript memory. File size is roughly the sum of
the source files plus a small UTF-8 JSON manifest.

| Offset         | Contents                                                |
| -------------- | ------------------------------------------------------- |
| 0–7            | Eight ASCII bytes: `CUTLINE` followed by newline (`0A`) |
| 8–11           | Unsigned 32-bit little-endian manifest byte length      |
| 12…            | UTF-8 JSON manifest, maximum 32 MiB                     |
| After manifest | Original media bytes, concatenated in manifest order    |

Manifest fields:

```json
{
  "format": "cutline-project",
  "version": 1,
  "project": { "version": 4, "name": "My project", "...": "complete Project data" },
  "media": [{ "id": "asset-id", "type": "video/mp4", "size": 12345 }]
}
```

The container version and project schema version evolve independently. The
reader migrates supported older project schemas and rejects unsupported
container versions, invalid project data, duplicate/missing media, truncated
payloads and unexpected trailing bytes before changing the editor. Original
filenames are in `project.assets`. Empty MIME types are allowed for media
whose type is determined by its contents.

Opening assigns fresh media IDs and persists the source files before switching
timelines, so it never overwrites media needed by the previous project. The
switch is one undo step. Failure to parse the file or store its media leaves the
current project intact. Media decoding happens afterward and reports unsupported
codecs using the usual media-bin error state. Missing source files prevent Save
from silently producing an incomplete bundle.
