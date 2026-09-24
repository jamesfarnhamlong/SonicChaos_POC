// The POC's existing x=3970 completion adapter selects the verified state-4
// presentation sequence; it is not described as the original type-$18 trigger.
if (global.chaosComplete) {
    chaosState = 4;
    image_index = chaosSpinFrames[floor(chaosSpinTick / 2) mod array_length(chaosSpinFrames)];
    chaosSpinTick++;
} else {
    chaosState = 3;
    chaosSpinTick = 0;
    image_index = 0;
}
