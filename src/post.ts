import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export class ContactShadows extends GTAOPass {
  private excluded: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super(scene, camera, 512, 512);
    this.blendIntensity = 0.37;
    this.updateGtaoMaterial({ radius: 0.28, thickness: 0.7, samples: 8, distanceFallOff: 1, scale: 1.05 });
    this.updatePdMaterial({ radius: 4, samples: 8, depthPhi: 1.5, normalPhi: 3 });
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (materials.some(material => material.transparent || !material.depthWrite)) this.excluded.push(object);
      }
    });
  }

  override setSize(width: number, height: number) {
    super.setSize(Math.max(1, Math.round(width * 0.65)), Math.max(1, Math.round(height * 0.65)));
  }

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean) {
    const hidden = this.excluded.filter(object => object.visible);
    const previousShadow = renderer.shadowMap.autoUpdate;
    hidden.forEach(object => { object.visible = false; });
    renderer.shadowMap.autoUpdate = false;
    try { super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive); }
    finally {
      hidden.forEach(object => { object.visible = true; });
      renderer.shadowMap.autoUpdate = previousShadow;
    }
  }
}

export function createColorGrade() {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      void main() {
        vec3 color = texture2D(tDiffuse, vUv).rgb;
        float luma = dot(color, vec3(0.2126,0.7152,0.0722));
        color = mix(vec3(luma),color,1.07);
        color *= mix(vec3(0.97,0.99,1.035),vec3(1.025,1.006,0.98),smoothstep(0.025,0.8,luma));
        float vignette = smoothstep(0.45,0.9,length((vUv-0.5)*vec2(1.0,0.92)));
        gl_FragColor = vec4(max(color * (1.0-vignette*0.12),0.0),1.0);
      }`,
  });
}
