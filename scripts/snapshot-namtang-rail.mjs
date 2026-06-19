// Extract Bangkok/Thailand RAIL stations (BTS/MRT/ARL/SRT) from the Namtang GTFS feed
// (namtang.otp.go.th — รุ่นพี่'s open transit data). Writes lib/data/transitStations.snapshot.json.
// Usage: unzip namtang-gtfs.zip to <dir>/gtfs, then: node scripts/snapshot-namtang-rail.mjs <dir>
import { readFileSync, writeFileSync } from "node:fs";
const dir = process.argv[2] || ".";
function split(l){const o=[];let c="",q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){c+='"';i++}else q=!q}else if(ch===","&&!q){o.push(c);c=""}else c+=ch}o.push(c);return o}
const txt=readFileSync(`${dir}/gtfs/stops.txt`,"utf8");
const L=txt.split(/\r?\n/).filter(Boolean);const H=split(L[0]);
const RAIL=/^(BTS|MRT|ARL|SRT|Airport Rail|SARL)\b/i;
const seen=new Set(),out=[];
for(let i=1;i<L.length;i++){const f=split(L[i]);const o={};H.forEach((h,j)=>o[h]=f[j]);
  const name=o.stop_name||""; if(!RAIL.test(name)) continue;
  const lat=+o.stop_lat,lng=+o.stop_lon; if(!isFinite(lat)||!isFinite(lng)||lat<5.5||lat>21||lng<97||lng>106) continue;
  const [th,en]=name.split(";"); const system=(name.match(RAIL)||[""])[0].toUpperCase().replace("AIRPORT RAIL","ARL").replace("SARL","ARL");
  const key=(en||th||"").trim().toLowerCase().replace(/\s+/g," "); if(seen.has(key)) continue; seen.add(key);
  out.push({th:(th||"").trim(),en:(en||th||"").trim(),lat:+lat.toFixed(6),lng:+lng.toFixed(6),system});
}
writeFileSync("lib/data/transitStations.snapshot.json",JSON.stringify({date:new Date().toISOString().slice(0,10),source:"namtang.otp.go.th",stations:out},null,0)+"\n");
const bySys={};for(const s of out)bySys[s.system]=(bySys[s.system]||0)+1;
console.log(`wrote ${out.length} rail stations`,JSON.stringify(bySys));
