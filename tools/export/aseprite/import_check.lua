-- tools/export/aseprite/import_check.lua -- Aseprite's own "Import Sprite Sheet" with a sidecar's settings (what a human does
-- in the GUI: File > Import Sprite Sheet, Type "By Rows", width / height = the sidecar's aseprite.cell, no padding), saved as
-- .aseprite. The wrapper then re-exports it with the plain CLI (--sheet-type rows --sheet-columns <cols>) and compares pixels.
--   Aseprite -b --script-param png=<sheet.png> --script-param w=<cw> --script-param h=<ch> --script-param out=<x.aseprite>
--            --script tools/export/aseprite/import_check.lua
local spr = app.open(app.params.png)
if spr.colorMode ~= ColorMode.RGB then app.command.ChangePixelFormat{ format = "rgb" } end
app.command.ImportSpriteSheet{ ui = false, type = SpriteSheetType.ROWS, frameBounds = Rectangle(0, 0, tonumber(app.params.w), tonumber(app.params.h)), padding = Size(0, 0), partialTiles = false }
spr:saveAs(app.params.out)
print("import_check: " .. #spr.frames .. " frames of " .. spr.width .. "x" .. spr.height)
