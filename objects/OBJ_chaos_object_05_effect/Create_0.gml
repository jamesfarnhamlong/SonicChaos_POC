// Numeric type $05, parameter zero: ROM-backed visible frames $01-$20.
// The original special-render anchor is unresolved. This POC-only bounded
// presentation adapter follows the active player while numeric selector $06
// remains active; it is never anchored to a consumed type-$10 placement.
image_speed = 0;
image_index = 0;
depth = -52; // POC presentation layer, matching the existing player-follow effect layer.
chaosFrame = 0;
chaosParameter = 0;
chaosAnchorAdapter = "player-relative POC adapter";
