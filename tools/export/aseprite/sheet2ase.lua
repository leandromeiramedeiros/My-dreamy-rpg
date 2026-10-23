-- tools/export/aseprite/sheet2ase.lua -- a handoff sheet (PNG grid + JSON sidecar) -> an editable .aseprite file.
-- Run by tools/export/aseprite.js (to-ase); by hand:
--   Aseprite -b --script-param plan=<plan.json> --script tools/export/aseprite/sheet2ase.lua
-- plan.json (written by the wrapper): { out, kind: "anim" | "atlas", cell: [w, h], grid: [cols, rows], origin: [x, y] | null,
--   dirs: [..] | null, anims: { name: { from, count, ms: [..] } } | null, palette: "<.gpl>" | null,
--   layers: [ { name, png, ref } ] (bottom to top; ref = reference only, locked, never written back) }
-- anim: one Aseprite frame per cell, frame k = row (direction) k // cols, column k % cols; a tag <anim>_<dir> per anim per
-- direction; frame durations from ms. atlas: one frame, the whole image, Aseprite's grid = the cell (View > Show Grid).
-- The pivot is a slice "origin" (its pivot = origin, in every frame). The plan is kept in the slice's user data, each layer's
-- PNG path in the layer's user data: ase2sheet.lua writes the same grid back.
local plan = json.decode(io.open(app.params.plan):read("a"))
local cw, ch = plan.cell[1], plan.cell[2]
local cols, rows = plan.grid[1], plan.grid[2]
local anim = plan.kind == "anim"
local W, H = anim and cw or cols * cw, anim and ch or rows * ch
local nframes = anim and cols * rows or 1

-- load a PNG as an RGB image (indexed PNGs converted, transparent index 0 -> alpha 0)
local function loadRGB(path)
  local spr = app.open(path)
  if spr.colorMode ~= ColorMode.RGB then app.command.ChangePixelFormat{ format = "rgb" } end
  local img = spr.cels[1].image:clone()
  local pos = spr.cels[1].position
  spr:close()
  return img, pos
end
local function copyRect(src, sx, sy, w, h)
  local out = Image(w, h, ColorMode.RGB)
  for y = 0, h - 1 do
    for x = 0, w - 1 do
      local X, Y = sx + x, sy + y
      if X >= 0 and Y >= 0 and X < src.width and Y < src.height then out:drawPixel(x, y, src:getPixel(X, Y)) end
    end
  end
  return out
end

local spr = Sprite(W, H, ColorMode.RGB)
app.transaction(function()
  for i = 2, nframes do spr:newEmptyFrame() end
  if anim then
    for name, a in pairs(plan.anims) do
      for r = 0, rows - 1 do
        for f = 0, a.count - 1 do spr.frames[r * cols + a.from + f + 1].duration = (a.ms[f + 1] or 100) / 1000 end
      end
    end
  end
  local first = spr.layers[1]
  for li, L in ipairs(plan.layers) do
    local layer = li == 1 and first or spr:newLayer()
    layer.name = L.name
    layer.data = json.encode({ png = L.png, ref = L.ref or false })
    local img, pos = loadRGB(L.png)
    -- a PNG from the exporter starts at (0, 0); an offset cel (hand-made) is honoured
    local full = Image(math.max(img.width + pos.x, cols * cw), math.max(img.height + pos.y, rows * ch), ColorMode.RGB)
    full:drawImage(img, pos)
    if anim then
      for r = 0, rows - 1 do
        for c = 0, cols - 1 do
          local cell = copyRect(full, c * cw, r * ch, cw, ch)
          if not cell:isEmpty() then spr:newCel(layer, r * cols + c + 1, cell, Point(0, 0)) end
        end
      end
    else
      spr:newCel(layer, 1, copyRect(full, 0, 0, W, H), Point(0, 0))
    end
    if L.ref then layer.isEditable = false end
  end
  if anim then
    for name, a in pairs(plan.anims) do
      for r = 0, rows - 1 do
        local t = spr:newTag(r * cols + a.from + 1, r * cols + a.from + a.count)
        t.name = name .. "_" .. (plan.dirs and plan.dirs[r + 1] or tostring(r))
      end
    end
  else
    spr.gridBounds = Rectangle(0, 0, cw, ch)
  end
  local s = spr:newSlice(Rectangle(0, 0, W, H))
  s.name = "origin"
  if plan.origin then s.pivot = Point(plan.origin[1], plan.origin[2]) end
  s.data = json.encode({ kind = plan.kind, cell = { cw, ch }, grid = { cols, rows }, sidecar = plan.sidecar })   -- fresh tables: a decoded array re-encodes as null
  if plan.palette and app.fs.isFile(plan.palette) then spr:setPalette(Palette{ fromFile = plan.palette }) end
end)
spr:saveAs(plan.out)
print("sheet2ase: " .. plan.out .. " (" .. #spr.layers .. " layers, " .. #spr.frames .. " frames, " .. #spr.tags .. " tags)")
