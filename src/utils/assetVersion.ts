/**
 * Cache-busting for bundled destination photos (public/image/destination-*).
 *
 * These are referenced by a fixed path (e.g. "/image/destination-tokyo.jpg")
 * that never changes even if the file behind it is replaced — unlike the
 * live Pexels/Pixabay photos (see destinationImages.ts), whose URLs embed
 * a per-asset ID, so a different photo is always a different URL. A fixed
 * path has no such protection: a browser or CDN that already cached the
 * old file's bytes has no reason to ever re-fetch it, so swapping the file
 * on disk without changing anything else can leave visitors stuck on the
 * stale image indefinitely.
 *
 * Bump BUNDLED_PHOTO_VERSION whenever any file under public/image/
 * destination-*.jpg (or the curated ones in destinationImages.ts) is
 * replaced with new content at the same filename — every reference goes
 * through withPhotoVersion() below, so one bump invalidates all of them.
 */
export const BUNDLED_PHOTO_VERSION = 1;

export function withPhotoVersion(path: string): string {
  return `${path}?v=${BUNDLED_PHOTO_VERSION}`;
}
