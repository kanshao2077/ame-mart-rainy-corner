import * as THREE from "three";
import { Kit, type XYZ } from "./kit.ts";

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createWeather(kit: Kit) {
  const rand = random(73);
  const count = 720;
  const positions = new Float32Array(count * 3);
  const lengths = new Float32Array(count);
  const alphas = new Float32Array(count);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rand() - 0.5) * 14.7;
    positions[i * 3 + 1] = rand() * 8.5;
    positions[i * 3 + 2] = (rand() - 0.5) * 14.7;
    speed[i] = 7 + rand() * 4;
    lengths[i] = 0.15 + rand() * 0.14;
    alphas[i] = 0.045 + rand() * 0.10;
  }
  const quad = new THREE.PlaneGeometry(1,1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute('position',quad.getAttribute('position'));
  geometry.setAttribute('uv',quad.getAttribute('uv'));
  const attribute = new THREE.InstancedBufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("offset", attribute);
  geometry.setAttribute('streakLength',new THREE.InstancedBufferAttribute(lengths,1));
  geometry.setAttribute('opacity',new THREE.InstancedBufferAttribute(alphas,1));
  geometry.instanceCount = count;
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 offset;
      attribute float streakLength;
      attribute float opacity;
      varying vec2 vUv;
      varying float vOpacity;
      varying vec3 vColor;
      void main(){
        vUv=uv; vOpacity=opacity;
        float inLight=exp(-length(offset.xz-vec2(4.8,2.9))*0.65)*0.8;
        vColor=mix(vec3(0.53,0.69,0.83),vec3(1.0,0.81,0.52),inLight);
        vec4 center=modelViewMatrix*vec4(offset,1.0);
        vec2 fall=(viewMatrix*vec4(-0.10,-1.0,0.0,0.0)).xy;
        vec2 across=normalize(vec2(-fall.y,fall.x));
        center.xy+=across*position.x*0.014-fall*position.y*streakLength;
        gl_Position=projectionMatrix*center;
      }`,
    fragmentShader: `
      varying vec2 vUv; varying float vOpacity; varying vec3 vColor;
      void main(){
        float a=exp(-pow((vUv.x-0.5)*4.0,2.0))*smoothstep(0.0,0.25,vUv.y)*(1.0-smoothstep(0.65,1.0,vUv.y))*vOpacity;
        gl_FragColor=vec4(vColor,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const rain = new THREE.Mesh(geometry, material);
  rain.userData.dynamic = true;
  rain.layers.set(2);
  rain.frustumCulled = false;
  rain.renderOrder = 5;
  kit.root.add(rain);

  const rippleMaterial = new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute float fade; varying float vFade; varying vec2 vUv;
      void main(){vFade=fade;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying float vFade;varying vec2 vUv;
      void main(){float r=length(vUv-0.5)*2.0;
        float edge=exp(-pow((r-0.78)*25.0,2.0));
        gl_FragColor=vec4(0.62,0.78,0.85,edge*vFade*0.22);}`,
  });
  const rippleGeometry = new THREE.PlaneGeometry(1,1);
  const fades = new Float32Array(48);
  rippleGeometry.setAttribute('fade',new THREE.InstancedBufferAttribute(fades,1));
  const ripples = new THREE.InstancedMesh(rippleGeometry, rippleMaterial, 48);
  ripples.layers.set(2);
  ripples.userData.dynamic = true;
  ripples.frustumCulled = false;
  kit.root.add(ripples);
  const ripplePositions: XYZ[] = [];
  for (let i = 0; i < 48; i++) {
    const x = (rand() - 0.5) * 14.5;
    let z = (rand() - 0.5) * 14.5;
    if (x > -6.2 && x < 4.3 && z > -6 && z < 3.5) z = 3.8 + rand() * 3.4;
    ripplePositions.push([x, 0.197, z]);
  }
  const dummy = new THREE.Object3D();
  dummy.rotation.x = -Math.PI / 2;

  function update(delta: number, time: number, reduced: boolean) {
    rain.visible = !reduced;
    ripples.visible = !reduced;
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      const p = i * 3;
      positions[p + 1] -= speed[i] * delta;
      positions[p] -= delta * 0.5;
      const x=positions[p],z=positions[p+2];
      let floor = x>-6.25 && x<4.36 && z>-6.05 && z<3.55 ? 0.36:0.16;
      if(x>-4.4 && x<3.4 && z>-4.7 && z<1.4) floor=4.22;
      if(x>-4.3 && x<3.35 && z>1.4 && z<1.99) floor=3.35;
      if(x>-3.5 && x<-0.7 && z>-3.8 && z<-2.65) floor=4.9;
      if (positions[p + 1] < floor) {
        positions[p + 1] = 8 + rand();
        positions[p] = (rand() - 0.5) * 14.7;
      }
    }
    attribute.needsUpdate = true;
    for (let i = 0; i < 48; i++) {
      const phase = (time * 0.73 + i * 0.618) % 1;
      dummy.position.set(...ripplePositions[i]);
      dummy.scale.setScalar(phase * 0.36 + 0.025);
      dummy.updateMatrix();
      ripples.setMatrixAt(i, dummy.matrix);
      fades[i]=(1-phase)*(1-phase);
    }
    ripples.instanceMatrix.needsUpdate = true;
    rippleGeometry.getAttribute('fade').needsUpdate = true;
  }
  return { update };
}

export function addWetDetails(kit: Kit) {
  const rand = random(914);
  const puddleMaterial = new THREE.MeshPhysicalMaterial({
    color: "#536c79",
    roughness: 0.09,
    metalness: 0,
    transparent: true,
    opacity: 0.10,
    depthWrite: false,
    clearcoat: 1,
  });
  for (let i = 0; i < 28; i++) {
    const x = (rand() - 0.5) * 14.3;
    const z = 3.93 + rand() * 3.1;
    const shape = new THREE.Shape();
    for (let j = 0; j <= 24; j++) {
      const angle = (j / 24) * Math.PI * 2;
      const r = 0.75 + Math.sin(j * 1.7 + i) * 0.14 + rand() * 0.12;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (!j) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    const mesh = kit.mesh(new THREE.ShapeGeometry(shape), puddleMaterial, [x, 0.176, z]);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.set(0.3 + rand() * 0.65, 0.1 + rand() * 0.22, 1);
    mesh.castShadow = false;
  }
  const texture = kit.paint(512, 512, (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    const glow = ctx.createRadialGradient(256, 256, 4, 256, 256, 240);
    glow.addColorStop(0, "rgba(255,227,167,0.65)");
    glow.addColorStop(0.3, "rgba(235,212,169,0.22)");
    glow.addColorStop(1, "rgba(225,221,182,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 512, 512);
  });
  const pools: [XYZ, number, number][] = [
    [[0, 0.181, 2.9], 7.8, 4.6],
    [[4.8, 0.181, 2.95], 3.2, 3.2],
    [[-5.4, 0.36, 1.6], 1.7, 1.5],
  ];
  for (const [p, width, height] of pools) {
    const glow = kit.mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      p,
    );
    glow.rotation.x = -Math.PI / 2;
    glow.castShadow = false;
  }
}
