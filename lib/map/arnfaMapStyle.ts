import positronBase from "./positronBase.json";

/**
 * arnfaMapStyle — Arnfa's OWN editorial basemap.
 *
 * We take OpenFreeMap's clean "positron" vector style (OpenMapTiles schema, ODbL data)
 * and recolour it to the "เปิดฟ้า / Open Sky" palette: warm-paper land, soft dusty-blue
 * water, light-sage green, hairline roads, restrained ink labels. The senior maps
 * (NostraMap etc.) are licensed — we don't lift their tiles; we craft our own look in the
 * same calm, legible spirit, on open data we're allowed to restyle.
 *
 * Result: the map stops looking like a generic Google-ish basemap and starts reading like
 * the rest of Arnfa — a quiet broadsheet that lets the route + weather-fit markers speak.
 *
 * Pure + deterministic. Returns a fresh clone each call (MapLibre mutates the style object).
 */

const PAPER = "#F6F1E8";      // land — the brand paper, a touch lighter than the page
const PAPER_SOFT = "#F1EADC"; // residential / landuse wash — barely separated from land
const WATER = "#D6E0E8";      // soft dusty blue (desaturated rain)
const WATER_DEEP = "#C7D4DF";
const GREEN = "#E0E8DA";      // light sage (desaturated success)
const BUILDING = "#ECE5D6";   // buildings — barely there, no outline
const ROAD_HI = "#FCFAF4";    // warm white road fill (motorway/major inner)
const ROAD_MINOR = "#F4EFE4"; // minor roads — almost invisible → declutter
const ROAD_CASING = "#E6DDCB";// warm ink-tint casing
const ROAD_PATH = "#E2DAC8";  // footpaths / tracks
const INK = "#2A2E38";        // place labels
const INK_SOFT = "#8B8675";   // minor / road-name labels (muted warm grey)
const LABEL_HALO = "#F6F1E8"; // paper halo so labels stay legible on any feature
const WATER_LABEL = "#7E93A6";
const BOUNDARY = "#D9CFBB";   // admin lines — faint warm hairline

type AnyLayer = Record<string, any>;

function setColor(layer: AnyLayer, key: string, value: string) {
  layer.paint = layer.paint || {};
  // only override when positron used a flat colour (don't clobber data-driven expressions)
  const cur = layer.paint[key];
  if (cur === undefined || typeof cur === "string") layer.paint[key] = value;
}

function recolour(layer: AnyLayer): AnyLayer {
  const id: string = layer.id || "";
  const t: string = layer.type || "";

  if (t === "background") { setColor(layer, "background-color", PAPER); return layer; }

  // Land / landcover / landuse — flatten to paper so the canvas is calm
  if (/^(landcover|landuse|land$|park_outline)/i.test(id)) {
    if (/wood|forest|grass|park|green/i.test(id)) setColor(layer, "fill-color", GREEN);
    else if (/residential|commercial|industrial|built/i.test(id)) setColor(layer, "fill-color", PAPER_SOFT);
    else if (/ice|glacier/i.test(id)) setColor(layer, "fill-color", "#FBFAF6");
    else setColor(layer, "fill-color", PAPER);
    return layer;
  }
  if (id === "park") { setColor(layer, "fill-color", GREEN); return layer; }

  // Water
  if (/water|sea|ocean|river|waterway/i.test(id) && !/label|name/i.test(id)) {
    setColor(layer, "fill-color", id === "water" ? WATER : WATER_DEEP);
    setColor(layer, "line-color", WATER_DEEP);
    return layer;
  }

  // Buildings — fade right back, drop any outline
  if (/building/i.test(id)) {
    setColor(layer, "fill-color", BUILDING);
    if (layer.paint) { layer.paint["fill-outline-color"] = BUILDING; layer.paint["fill-opacity"] = 0.5; }
    return layer;
  }

  // Roads
  if (/motorway|trunk/i.test(id)) {
    setColor(layer, "line-color", /casing/i.test(id) ? ROAD_CASING : ROAD_HI);
  } else if (/major|primary|secondary/i.test(id)) {
    setColor(layer, "line-color", /casing/i.test(id) ? ROAD_CASING : ROAD_HI);
  } else if (/path|pier|track|service/i.test(id)) {
    setColor(layer, "line-color", ROAD_PATH);
  } else if (/highway|road|street|minor|bridge|tunnel/i.test(id)) {
    setColor(layer, "line-color", /casing/i.test(id) ? ROAD_CASING : ROAD_MINOR);
  }

  // Admin boundaries
  if (/boundary|admin|border/i.test(id)) { setColor(layer, "line-color", BOUNDARY); return layer; }

  // Labels (symbol layers)
  if (t === "symbol") {
    if (/water|waterway/i.test(id)) setColor(layer, "text-color", WATER_LABEL);
    else if (/highway|road|street|shield/i.test(id)) setColor(layer, "text-color", INK_SOFT);
    else if (/country|state|city_capital|capital/i.test(id)) setColor(layer, "text-color", INK);
    else if (/city|town|place/i.test(id)) setColor(layer, "text-color", INK);
    else setColor(layer, "text-color", INK_SOFT);
    setColor(layer, "text-halo-color", LABEL_HALO);
    layer.paint = layer.paint || {};
    if (layer.paint["text-halo-width"] === undefined || typeof layer.paint["text-halo-width"] === "number")
      layer.paint["text-halo-width"] = 1.4;
    return layer;
  }

  return layer;
}

let cached: any = null;

/** The Arnfa basemap style object (recoloured positron). Clone-per-call safe. */
export function arnfaMapStyle(): any {
  if (!cached) {
    const base = JSON.parse(JSON.stringify(positronBase));
    base.layers = (base.layers as AnyLayer[]).map(recolour);
    cached = base;
  }
  // MapLibre may mutate the style → hand out a fresh clone every time
  return JSON.parse(JSON.stringify(cached));
}

/** Fallback URL if the bundled style ever fails to apply. */
export const ARNFA_MAP_FALLBACK_URL = "https://tiles.openfreemap.org/styles/positron";
