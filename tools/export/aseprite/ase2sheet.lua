-- tools/export/aseprite/ase2sheet.lua -- an edited .aseprite (made by sheet2ase.lua) -> the same PNG grid(s) again.
-- Run by tools/export/aseprite.js (from-ase); by hand:
--   Aseprite -b --script-param file=<x.aseprite> --script-param outdir=<dir> --script tools/export/aseprite/ase2sheet.lua
-- For every layer that is not a reference layer: frame k goes back to cell (column k % cols, row k // cols) of a sheet the
-- original size (anim), or the one frame is the whole atlas; written as RGBA PNG <outdir>/<n>.png, and a list
-- <outdir>/layers.json [{ png (the handoff path from the layer's user data), tmp }]. The wrapper re-encodes them into the
-- handoff (lean indexed PNG) and leaves every sidecar alone. Layer / cel opacity and blend modes are ignored (pixels only).
local spr = app.open(app.params.file)
local meta
for _, s in ipairs(spr.slices) do if s.name == "origin" then meta = json.decode(s.data) end end
assert(meta, "no 'origin' slice with the grid (was this file made by sheet2ase.lua?)")
local cw, ch = meta.cell[1], meta.cell[2]
local cols, rows = meta.grid[1], meta.grid[2]
local anim = meta.kind == "anim"
if spr.colorMode ~= ColorMode.RGB then app.command.ChangePixelFormat{ format = "rgb" } end
local list, n = {}, 0
for _, layer in ipairs(spr.layers) do
  local d = (layer.data and layer.data ~= "") and json.decode(layer.data) or nil
  if d and d.png and not d.ref then
    local out = Image(cols * cw, rows * ch, ColorMode.RGB)
    for _, cel in ipairs(layer.cels) do
      local k = cel.frameNumber - 1
      local ox, oy = 0, 0
      if anim then ox, oy = (k % cols) * cw, (k // cols) * ch end
      local img, p = cel.image, cel.position
      local x0, y0 = p.x, p.y
      for y = 0, img.height - 1 do
        for x = 0, img.width - 1 do
          local X, Y = x0 + x, y0 + y
          local inside = anim and (X >= 0 and Y >= 0 and X < cw and Y < ch) or (not anim and k == 0 and X >= 0 and Y >= 0 and X < cols * cw and Y < rows * ch)
          if inside then out:drawPixel(ox + X, oy + Y, img:getPixel(x, y)) end
        end
      end
    end
    n = n + 1
    local tmp = app.fs.joinPath(app.params.outdir, string.format("%03d.png", n))
    out:saveAs(tmp)
    table.insert(list, { png = d.png, tmp = tmp, layer = layer.name })
  end
end
local f = io.open(app.fs.joinPath(app.params.outdir, "layers.json"), "w")
f:write(json.encode(list)); f:close()
print("ase2sheet: " .. n .. " layer sheet(s) from " .. app.params.file)
