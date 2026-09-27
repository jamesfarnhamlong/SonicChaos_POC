// Verified state-3 records: 4×$07,4×$08,4×$09,4×$07,4×$08,
// 8×$09,4×$08,4×$07,1×$07, then empty frame $00 for $80 updates.
if (chaosTick < 4) image_index = 0;
else if (chaosTick < 8) image_index = 1;
else if (chaosTick < 12) image_index = 2;
else if (chaosTick < 16) image_index = 0;
else if (chaosTick < 20) image_index = 1;
else if (chaosTick < 28) image_index = 2;
else if (chaosTick < 32) image_index = 1;
else image_index = 0;
visible = chaosTick < 37;
chaosTick++;
if (chaosTick >= 165) instance_destroy();
