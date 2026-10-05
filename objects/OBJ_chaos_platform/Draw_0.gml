// Presentation adapter: the platform art's first opaque row is anchor + 2 (Research docs/platform-spike-collision-audit.md section 7; the 32x16 sprite is opaque on all rows).
// The collision anchor (x, y) is never offset.
// SEZ's approved SAT canvas already embeds the +1,+18 registration; its first
// opaque row is anchor+2. The older trimmed sprites add that row offset here.
if (!variable_instance_exists(id,"chaosGpzLifecycle") || !chaosGpzLifecycle || (chaosLive && !chaosAsleep && !chaosConsumed)) draw_sprite(sprite_index, image_index, x, chaos_is_sez() ? y : y + 2);
