if (chaosTick >= array_length(chaosFrames)) { instance_destroy(); exit; }
var cp_frame=chaosFrames[chaosTick];
visible=cp_frame != 0; image_index=max(0,cp_frame-7);
chaosTick++;
// The first final-blank callback deletes parameter-zero smoke immediately.
if (chaosTick >= array_length(chaosFrames)) instance_destroy();
