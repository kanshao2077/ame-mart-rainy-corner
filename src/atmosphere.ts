import * as THREE from 'three';
import type { Kit } from './kit.ts';

export function createAtmosphere(kit: Kit) {
  const dummy = new THREE.Object3D();
  const glassMaterial = new THREE.MeshBasicMaterial({
    color: '#d2eee9', transparent: true, opacity: 0.18,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const streaks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.008, 0.24), glassMaterial, 80);
  streaks.userData.dynamic = true;
  streaks.frustumCulled = false;
  streaks.renderOrder = 4;
  kit.root.add(streaks);

  const drops = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 5, 4),
    new THREE.MeshBasicMaterial({ color: '#a7d8e7', transparent: true, opacity: 0.45, depthWrite: false }),
    52,
  );
  drops.userData.dynamic = true;
  drops.frustumCulled = false;
  kit.root.add(drops);

  // A small signal belongs to the street model, beyond the side crossing.
  const signal = new THREE.Group();
  signal.position.set(5.1, 0.15, -6.1);
  kit.root.add(signal);
  kit.cylinder([0, 1.65, 0], 0.047, 3.3, '#71858d', signal);
  kit.box([0, 3.25, 0], [1.06, 0.38, 0.32], '#233541', signal, true);
  const signalColors = ['#ff756b', '#f5c47d', '#87d9b4'];
  const lamps = signalColors.map((color, i) => {
    kit.cylinder([-0.31 + i * 0.31, 3.25, 0.18], 0.117, 0.03, '#142832', signal, 16).rotation.x = Math.PI / 2;
    const material = new THREE.MeshBasicMaterial({ color });
    const lamp = kit.mesh(new THREE.CircleGeometry(0.091, 16), material, [-0.31 + i * 0.31, 3.25, 0.201], signal);
    lamp.userData.dynamic = true;
    return material;
  });

  function update(time: number, reduced: boolean) {
    streaks.visible = !reduced;
    drops.visible = !reduced;
    if (!reduced) {
      for (let i = 0; i < 80; i++) {
        const phase = (time * (0.052 + (i % 7) * 0.008) + i * 0.618) % 1;
        const across = ((i * 0.754877) % 1);
        const y = 3.17 - phase * 2.17;
        if (i < 40) {
          dummy.position.set(-4.16 + across * 5.27, y, 1.311);
          dummy.rotation.set(0, 0, -0.015);
        } else {
          dummy.position.set(3.322, y, -4.48 + across * 5.65);
          dummy.rotation.set(0, Math.PI / 2, 0.012);
        }
        dummy.scale.set(0.65 + (i % 3) * 0.25, 0.35 + (i % 5) * 0.19, 1);
        dummy.updateMatrix();
        streaks.setMatrixAt(i, dummy.matrix);
      }
      streaks.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 52; i++) {
        const phase = (time * (0.66 + (i % 5) * 0.09) + i * 0.618) % 1;
        const side = i > 33;
        dummy.position.set(
          side ? 3.43 : -4.17 + (i / 33) * 7.37,
          (side ? 3.43 : 3.18) - phase * phase * (side ? 3.06 : 2.8),
          side ? -4.45 + ((i - 34) / 17) * 5.65 : 1.97,
        );
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.011, 0.022 + phase * 0.035, 0.011);
        dummy.updateMatrix();
        drops.setMatrixAt(i, dummy.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;
    }
    const phase = reduced ? 3 : time % 28;
    const active = phase < 12 ? 2 : phase < 14 ? 1 : 0;
    lamps.forEach((lamp, i) => lamp.color.set(signalColors[i]).multiplyScalar(i === active ? 1.7 : 0.12));
  }
  return { update };
}
