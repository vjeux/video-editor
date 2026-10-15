import type { IdFactory } from "../core/types";
import { MediaLibrary } from "../engine/media-library";
import { Player } from "../engine/player";

export const media = new MediaLibrary();
export const player = new Player(media);
export const newId: IdFactory = () => crypto.randomUUID();
