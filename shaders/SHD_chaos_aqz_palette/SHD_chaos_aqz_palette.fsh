varying vec2 v_vTexcoord;
varying vec4 v_vColour;
varying float v_world_y;
uniform vec3 above[32];
uniform vec3 split[32];
uniform vec3 submerged[32];
uniform float screen_top;
uniform float irq_cut;
uniform float palette_mode;
uniform float player_source;
void main() {
    // Decode immutable texture data BEFORE applying vertex tint/alpha.
    vec4 col=texture2D(gm_BaseTexture,v_vTexcoord);
    bool proxy=player_source>0.5;
    float idx=proxy ? floor(col.a*255.0+0.5)-1.0 : floor(col.r*255.0+0.5)-1.0;
    bool encoded=proxy ? (idx>=16.0 && idx<32.0) : (abs(col.g-1.0/255.0)<0.001 && abs(col.b-1.0/255.0)<0.001 && idx>=0.0 && idx<32.0);
    bool lower=(palette_mode>1.5 && v_world_y-screen_top>=irq_cut);
    bool full=(palette_mode>0.5 && palette_mode<1.5);
    vec3 output_rgb=col.rgb;
    for (int i=0;i<32;i++) {
        if (encoded && abs(float(i)-idx)<0.5) {
            // Base RGB of a player copy is exact above water. Water is direct lookup.
            output_rgb=full ? submerged[i] : (lower ? split[i] : (proxy ? col.rgb : above[i]));
        }
    }
    float alpha=proxy && encoded ? 1.0 : col.a;
    gl_FragColor=vec4(output_rgb,alpha)*v_vColour;
}
