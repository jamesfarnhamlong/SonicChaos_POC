// Type $18 goal sign. Placement and frames are ROM/reference verified; behaviour follows docs/object-18-act-clear.md via
// SCR_chaos_goal (contact -> hop/spin -> landing -> $19 child). The instance keeps its canonical x,y; the hop is a draw offset.
image_speed = 0;
image_index = 0;
chaosState = 3;
chaosSpinTick = 0;
chaosSpinFrames = [0,0,1,2,3,4,3,2,1];
chaosSign = chaos_goal_sign_new();
chaosHopDy = 0;
chaosWoke = false;  // wake latch for the footwear conversion (see Step)
if (chaos_is_mghz()) sprite_index=SPR_chaos_mghz_sign;
else if (chaos_is_gpz()) sprite_index=SPR_chaos_gpz_sign;
chaosPrizeTableCpu=(chaos_is_gpz() || chaos_is_mghz()) ? $A962 : $A919;
chaosPrizeRows=(chaos_is_gpz() || chaos_is_mghz()) ? chaos_gpz_prize_rows() : chaos_thz_prize_rows(); // data integration only; accepted prize/retry presentation remains deferred.
