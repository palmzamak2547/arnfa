/**
 * arnfaMapStyle — Arnfa's OWN editorial basemap.
 *
 * We load OpenFreeMap's clean "positron" vector style by URL (the proven path that loads the
 * OpenMapTiles vector tiles + glyphs correctly) and recolour it AFTER load to the
 * "เปิดฟ้า / Open Sky" palette: warm-paper land, soft dusty-blue water, light-sage green,
 * white road ribbons with defined edges, restrained ink labels. The senior maps (NostraMap
 * etc.) are licensed — we don't lift their tiles; we craft our own calm, legible look on open
 * data we're allowed to restyle.
 *
 * Why recolour-after-load instead of a bundled style object: passing a style object whose
 * source is a TileJSON `url` ref didn't render the vector layers in our stack (only the
 * background drew). Loading by URL renders correctly; we then setPaintProperty per layer.
 */

export const ARNFA_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export const ARNFA_LAND = "#F4EEE2"; // land — warm brand paper; also the sentinel for "is the map already recoloured?"
const PAPER = ARNFA_LAND;
const PAPER_SOFT = "#EFE7D8"; // residential / landuse wash
const WATER = "#BFD6E6";      // dusty blue, clearly readable against paper
const WATER_DEEP = "#AEC8DC";
const GREEN = "#D5E3C9";      // light sage, visible
const BUILDING = "#EAE1CF";   // buildings — soft, no hard outline
const ROAD_HI = "#FFFFFF";    // motorway / major fill — white ribbons read on cream
const ROAD_MINOR = "#FCF9F3"; // minor roads — warm white, still visible vs paper
const ROAD_CASING = "#D7CBB2";// warm casing — gives every road a defined edge
const ROAD_PATH = "#CFC4AC";  // footpaths / tracks
const INK = "#26303C";        // place labels — strong enough to orient by
const INK_SOFT = "#7C7768";   // minor / road-name labels (muted warm grey)
const LABEL_HALO = "#F4EEE2"; // paper halo so labels stay legible on any feature
const WATER_LABEL = "#6E89A0";
const BOUNDARY = "#D2C7B0";   // admin lines — faint warm hairline

type AnyMap = {
  getStyle: () => { layers?: { id: string; type: string }[] } | undefined;
  setPaintProperty: (layer: string, prop: string, value: unknown) => void;
};

/**
 * Recolour a loaded positron map in place to the Open Sky palette. Type-aware + each set is
 * guarded, so a property that doesn't apply to a layer is simply skipped (never throws).
 * Idempotent — safe to call again after a style reload.
 */
export function applyArnfaRecolor(map: AnyMap): void {
  const style = map.getStyle?.();
  if (!style || !Array.isArray(style.layers)) return;
  for (const layer of style.layers) {
    const id = layer.id || "";
    const t = layer.type;
    const set = (k: string, v: unknown) => { try { map.setPaintProperty(id, k, v); } catch { /* prop n/a for this layer */ } };

    if (t === "background") { set("background-color", PAPER); continue; }

    if (t === "fill") {
      if (/wood|forest|grass|park|green|garden/i.test(id)) set("fill-color", GREEN);
      else if (/water|sea|ocean|river|bay|reservoir/i.test(id)) set("fill-color", id === "water" ? WATER : WATER_DEEP);
      else if (/building/i.test(id)) { set("fill-color", BUILDING); set("fill-outline-color", BUILDING); set("fill-opacity", 0.55); }
      else if (/residential|commercial|industrial|built|suburb|neighbourhood/i.test(id)) set("fill-color", PAPER_SOFT);
      else if (/ice|glacier|snow/i.test(id)) set("fill-color", "#FBFAF6");
      else if (/landcover|landuse|land$|sand|earth|cliff|rock/i.test(id)) set("fill-color", PAPER);
      continue;
    }

    if (t === "line") {
      if (/water|river|waterway|canal/i.test(id)) set("line-color", WATER_DEEP);
      else if (/boundary|admin|border/i.test(id)) set("line-color", BOUNDARY);
      else if (/motorway|trunk|major|primary|secondary/i.test(id)) set("line-color", /casing|outline/i.test(id) ? ROAD_CASING : ROAD_HI);
      else if (/path|pier|track|service|cycle|foot/i.test(id)) set("line-color", ROAD_PATH);
      else if (/highway|road|street|minor|bridge|tunnel|transit|rail/i.test(id)) set("line-color", /casing|outline/i.test(id) ? ROAD_CASING : ROAD_MINOR);
      continue;
    }

    if (t === "symbol") {
      if (/water|waterway/i.test(id)) set("text-color", WATER_LABEL);
      else if (/highway|road|street|shield|transit/i.test(id)) set("text-color", INK_SOFT);
      else set("text-color", INK);
      set("text-halo-color", LABEL_HALO);
      set("text-halo-width", 1.4);
      continue;
    }
  }
}
