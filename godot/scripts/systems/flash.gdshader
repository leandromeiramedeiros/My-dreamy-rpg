shader_type canvas_item;
// The hit flash / status tint of a body: FxTint layers set these (the colour and strength come from the FxData).
uniform vec4 flash_color : source_color = vec4(1.0);
uniform float flash : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	c.rgb = mix(c.rgb, flash_color.rgb, flash * flash_color.a);
	COLOR = c;
}
