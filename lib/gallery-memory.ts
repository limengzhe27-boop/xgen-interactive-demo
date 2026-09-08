export type GalleryBrowseState = { seed: string; genre: string; query: string; kind: 'all' | 'world' | 'character' };
export type GalleryPosition = { y: number; anchor?: string; offset?: number };

// Keep an actual card as the anchor: a responsive column change must not return
// the reader to a completely different story at the same absolute pixel value.
export function galleryTarget(position: GalleryPosition, anchorTop?: number, currentY = 0) {
  return Math.max(0, anchorTop === undefined ? position.y : currentY + anchorTop - (position.offset ?? 0));
}
export function captureGalleryPosition(): GalleryPosition {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-gallery-id]'));
  const card = cards.find(item => item.getBoundingClientRect().bottom > 100 && item.getBoundingClientRect().top < innerHeight);
  return { y: window.scrollY, anchor: card?.dataset.galleryId, offset: card?.getBoundingClientRect().top };
}
export function restoreGalleryPosition(position: GalleryPosition) {
  const card = Array.from(document.querySelectorAll<HTMLElement>('[data-gallery-id]')).find(item => item.dataset.galleryId === position.anchor);
  window.scrollTo({ top: galleryTarget(position, card?.getBoundingClientRect().top, window.scrollY), behavior: 'instant' });
}
