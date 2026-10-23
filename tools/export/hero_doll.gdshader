// HeroDoll layering shader (Godot 4.7, GL Compatibility / WebGL2). The spec, line for line: tools/export/doll.js.
// Every equipped layer is one colour sheet + one depth sheet (handoff/art/hero, gear). HeroDoll stacks the sheets of the
// current sheet kind (core, or atk.<class>) into two Texture2DArrays (layer l = the l-th unit in doll order) and draws one
// cell-sized quad. Per pixel:
//   1. resolve: the layer with the nearest depth wins (a later layer wins a tie). Depth = the _z sheet's grey (0..255), or
//      defaults[l] (the sidecar's depth.default for this direction) where the _z pixel is transparent (a hand-painted pixel).
//   2. seam: a winner that is not outline-coloured, whose colour is in its layer's shade row, with a 4-neighbour won by a
//      layer of another group (not outline-coloured) nearer by more than seam_jump, takes its shade colour.
//   3. one cluster pass: a drawn non-outline pixel with no 4-neighbour of its own colour takes the commonest neighbouring
//      colour (a tie takes the smaller RGB value).
// That needs the winners at 13 positions: p, its 4 neighbours, and theirs.
shader_type canvas_item;

#define MAXL 10
#define SHADES 64

uniform sampler2DArray colors : filter_nearest, repeat_disable;
uniform sampler2DArray depths : filter_nearest, repeat_disable;
// row l = layer l's shade map: texel 2k = a colour, 2k + 1 = its seam colour; the first transparent texel ends the row
uniform sampler2D shades : filter_nearest, repeat_disable;
uniform int layer_count = 0;
uniform ivec2 cell = ivec2(52, 56);
uniform ivec2 frame_cell = ivec2(0, 0);   // column, row of the frame in the sheets
uniform int defaults[MAXL];               // per layer: depth of an unpainted pixel for the current direction
uniform int groups[MAXL];                 // per layer: seam group (no seam between two layers of one group)
uniform ivec3 outline_rgb = ivec3(12, 7, 20);
uniform int seam_jump = 12;

const ivec2 OFF[13] = ivec2[](ivec2(0, 0), ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1),
	ivec2(2, 0), ivec2(1, 1), ivec2(1, -1), ivec2(-2, 0), ivec2(-1, 1), ivec2(-1, -1), ivec2(0, 2), ivec2(0, -2));
// the 4-neighbours (indices into OFF) of positions 0..4: right, left, down, up
const int NB[20] = int[](1, 2, 3, 4,  5, 0, 6, 7,  0, 8, 9, 10,  6, 9, 11, 0,  7, 10, 0, 12);

int key_of(vec4 c) {
	ivec3 v = ivec3(round(c.rgb * 255.0));
	return v.r * 65536 + v.g * 256 + v.b;
}

// the winner at q (cell coords): layer (-1 none), depth, colour key
void resolve(ivec2 q, out int lay, out int dep, out int col) {
	lay = -1;
	dep = -1;
	col = -1;
	if (q.x < 0 || q.y < 0 || q.x >= cell.x || q.y >= cell.y) {
		return;
	}
	ivec2 t = frame_cell * cell + q;
	for (int l = 0; l < MAXL; l++) {
		if (l >= layer_count) {
			break;
		}
		vec4 c = texelFetch(colors, ivec3(t, l), 0);
		if (c.a <= 0.0) {
			continue;
		}
		vec4 z = texelFetch(depths, ivec3(t, l), 0);
		int d = z.a > 0.0 ? int(round(z.r * 255.0)) : defaults[l];
		if (d >= dep) {
			dep = d;
			lay = l;
			col = key_of(c);
		}
	}
}

// layer l's seam colour for colour key k, or -1
int shade_of(int l, int k) {
	for (int s = 0; s < SHADES; s++) {
		vec4 a = texelFetch(shades, ivec2(2 * s, l), 0);
		if (a.a <= 0.0) {
			return -1;
		}
		if (key_of(a) == k) {
			return key_of(texelFetch(shades, ivec2(2 * s + 1, l), 0));
		}
	}
	return -1;
}

void fragment() {
	int OUTK = outline_rgb.r * 65536 + outline_rgb.g * 256 + outline_rgb.b;
	ivec2 p = ivec2(floor(UV * vec2(cell)));
	int L[13];
	int D[13];
	int K[13];
	for (int i = 0; i < 13; i++) {
		int a;
		int b;
		int c;
		resolve(p + OFF[i], a, b, c);
		L[i] = a;
		D[i] = b;
		K[i] = c;
	}
	if (L[0] < 0) {
		COLOR = vec4(0.0);
	} else {
		// 2. seams at p and its 4 neighbours
		int C1[5];
		for (int k = 0; k < 5; k++) {
			C1[k] = K[k];
			if (L[k] < 0 || K[k] == OUTK) {
				continue;
			}
			bool hit = false;
			for (int n = 0; n < 4; n++) {
				int j = NB[k * 4 + n];
				if (L[j] >= 0 && K[j] != OUTK && groups[L[j]] != groups[L[k]] && D[j] > D[k] + seam_jump) {
					hit = true;
				}
			}
			if (hit) {
				int s = shade_of(L[k], K[k]);
				if (s >= 0) {
					C1[k] = s;
				}
			}
		}
		// 3. one cluster pass at p
		int c = C1[0];
		if (c != OUTK) {
			bool same = false;
			int n = 0;
			int V[4];
			for (int k = 1; k < 5; k++) {
				if (L[k] >= 0 && C1[k] != OUTK) {
					if (C1[k] == c) {
						same = true;
					}
					V[n] = C1[k];
					n++;
				}
			}
			if (!same && n > 0) {
				int bv = 0;
				int bc = 0;
				for (int a = 0; a < 4; a++) {
					if (a >= n) {
						break;
					}
					int cnt = 0;
					for (int b = 0; b < 4; b++) {
						if (b < n && V[b] == V[a]) {
							cnt++;
						}
					}
					if (cnt > bc || (cnt == bc && V[a] < bv)) {
						bc = cnt;
						bv = V[a];
					}
				}
				c = bv;
			}
		}
		COLOR = vec4(float(c / 65536) / 255.0, float((c / 256) % 256) / 255.0, float(c % 256) / 255.0, 1.0);
	}
}
