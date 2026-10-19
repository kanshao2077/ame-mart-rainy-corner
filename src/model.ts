import { Kit } from "./kit.ts";
import type { SceneAnimation } from "./types.ts";
import { buildStore } from "./store.ts";
import { buildStreet } from "./street.ts";
import { addWetDetails, createWeather } from "./weather.ts";
import { createReflection } from "./reflection.ts";
import { createAtmosphere } from "./atmosphere.ts";

export function buildScene(kit: Kit): SceneAnimation {
  buildStreet(kit);
  const store = buildStore(kit);
  addWetDetails(kit);
  const weather = createWeather(kit);
  const atmosphere = createAtmosphere(kit);
  const reflection = createReflection(768);
  reflection.mesh.userData.dynamic = true;
  kit.root.add(reflection.mesh);
  return {
    update(delta, time, reduced, pixelsPerUnit) {
      weather.update(delta, time, reduced);
      store.update(time, reduced);
      atmosphere.update(time, reduced);
      reflection.update(reduced ? 0 : time);
    },
    dispose: reflection.dispose,
  };
}
