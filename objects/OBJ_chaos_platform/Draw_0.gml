// Presentation adapter: the platform art's first opaque row is anchor + 2 (Research docs/platform-spike-collision-audit.md section 7; the 32x16 sprite is opaque on all rows).
// The collision anchor (x, y) is never offset.
draw_sprite(sprite_index, image_index, x, y + 2);
