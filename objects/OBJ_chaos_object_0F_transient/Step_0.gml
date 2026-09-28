// Recovered bounded presentation sequence; the final empty lifetime is kept so
// the transient remains independent of terrain collision and player physics.
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
