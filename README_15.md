# Sonic Chaos Act 1 POC 15

POC 15 preserves the ROM-based shared movement core introduced in 14.5 and
replaces the provisional Act 1 spring/hazard adapters with decoded object state
machines.

## Object `$26` concealed springs

- Parameters `$00` and `$01` wait in original state 7 without drawing a spring.
- Valid top contact launches Sonic at `-7.375` or `-5.0` original pixels/update.
- States 1/3 extend 28 pixels in four seven-pixel steps.
- States 2/4 hold for 32 or 10 updates; states 5/6 retract in four steps.
- Parameter `$8A` uses state 8, a 160-pixel trigger span, and aligns the concealed
  spring beneath Sonic to a 16-pixel boundary before its weak launch.

The spring art remains a POC rendering of the decoded positions; the state,
timing, trigger span and impulses come from bank 30 `$825A..$8438`.

## Object `$1B` retracting spikes

The four records at `(1344,864)`, `(1936,864)`, `(2464,864)` and `(2912,864)`
now use the bank-12 state cycle:

- rise 18 pixels in three six-pixel steps;
- remain raised for `$30` active updates;
- retract in three six-pixel steps;
- remain hidden for `$30` active updates, then repeat.

Damage is active only during the rising/raised states, matching the original
handler calls. Object activation begins when the placement enters the camera
margin; exact despawn/reload scheduling remains a later full object-manager task.

## Player spring presentation

The recovered terrain-spring trajectory is unchanged. Vertical spring ascent is
held on the dedicated jump pose, switches to the falling presentation after the
apex, and clears on landing. This removes presentation flicker without changing
fixed-point movement.

## Test priorities

1. Opening red spring: height must match 14.5; watch ascent/apex/landing animation.
2. Lower-route spikes: observe at least two full cycles and test raised-state damage.
3. Springs at `(688,864)` and `(3568,768)`: invisible dormant, strong launch,
   extend/hold/retract.
4. Span spring beginning at `(1296,608)`: approach at different points across its
   160-pixel region and confirm the spring appears beneath Sonic.
5. Weak fixed spring at `(1912,864)`: compare its route with the SMS ROM.
6. Recheck the first curve, platforms and both loops for 14.5 regressions.

F3 continues to show core state and velocity. This source has been structurally
and numerically checked but not compiled or played in GameMaker in this environment.
