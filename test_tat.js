import { tatNearbyPlaces } from "./lib/tat/client.ts";
async function run() {
  const data = await tatNearbyPlaces(14.973, 102.100);
  console.log(data);
}
run();
