import * as THREE from "three";

export function createReflection(resolution: number) {
  const target = new THREE.WebGLRenderTarget(resolution, resolution, {
    type: THREE.HalfFloatType,
    depthBuffer: true,
  });
  const mirror = new THREE.OrthographicCamera();
  const textureMatrix = new THREE.Matrix4();
  const direction = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      tDiffuse: { value: target.texture },
      textureMatrix: { value: textureMatrix },
      time: { value: 0 },
      reflectionTexel: { value: new THREE.Vector2(1 / resolution, 1 / resolution) },
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 reflectionUv;
      varying vec2 surfaceUv;
      varying vec2 worldXZ;
      void main() {
        surfaceUv = uv;
        worldXZ = (modelMatrix * vec4(position,1.0)).xz;
        reflectionUv = textureMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float time;
      uniform vec2 reflectionTexel;
      varying vec4 reflectionUv;
      varying vec2 surfaceUv;
      varying vec2 worldXZ;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
      }
      void main() {
        float wet = smoothstep(0.24,0.73,noise(worldXZ*0.55)*0.75+noise(worldXZ*1.65+7.3)*0.25);
        vec2 uv = reflectionUv.xy / reflectionUv.w;
        vec2 warp = vec2(sin(worldXZ.y*8.0+time*1.4)+sin(worldXZ.x*6.0-time*0.9)*0.5,sin(worldXZ.x*10.0-time*1.15));
        uv += warp*0.0006*wet;
        vec2 dx = vec2(reflectionTexel.x,0), dy = vec2(0,reflectionTexel.y*2.8);
        vec3 reflected = texture2D(tDiffuse,uv).rgb*0.4;
        reflected += (texture2D(tDiffuse,uv+dx).rgb+texture2D(tDiffuse,uv-dx).rgb+texture2D(tDiffuse,uv+dy).rgb+texture2D(tDiffuse,uv-dy).rgb)*0.15;
        float luminance = dot(reflected, vec3(0.2126, 0.7152, 0.0722));
        gl_FragColor = vec4(reflected * vec3(0.92, 0.97, 1.0),
          mix(0.07,0.34,wet)*smoothstep(0.025,0.3,luminance));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(14.96, 14.96), material);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.154;
  water.renderOrder = 1;
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.16);
  const viewClip = new THREE.Plane();
  const clipVector = new THREE.Vector4();
  const farCorner = new THREE.Vector4();

  // Orthographic mirrors need an orthographic camera; perspective oblique clipping distorts the base.
  water.onBeforeRender = (renderer, scene, camera) => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    mirror.copy(camera);
    mirror.layers.disable(2);
    camera.getWorldPosition(eye);
    camera.getWorldDirection(direction);
    mirror.position.set(eye.x, 2 * water.position.y - eye.y, eye.z);
    direction.y *= -1;
    mirror.up.set(0, -1, 0);
    mirror.lookAt(mirror.position.clone().add(direction));
    mirror.updateMatrixWorld();
    // Oblique clipping for an orthographic projection. Keep clipping local to the
    // mirror camera: global renderer clipping leaks into the parent render pass.
    viewClip.copy(clip).applyMatrix4(mirror.matrixWorldInverse);
    clipVector.set(viewClip.normal.x,viewClip.normal.y,viewClip.normal.z,viewClip.constant);
    farCorner.set(Math.sign(clipVector.x),Math.sign(clipVector.y),1,1).applyMatrix4(mirror.projectionMatrixInverse);
    clipVector.multiplyScalar(2/clipVector.dot(farCorner));
    const projection=mirror.projectionMatrix.elements;
    projection[2]=clipVector.x;
    projection[6]=clipVector.y;
    projection[10]=clipVector.z;
    projection[14]=clipVector.w-1;
    mirror.projectionMatrixInverse.copy(mirror.projectionMatrix).invert();
    textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    textureMatrix
      .multiply(mirror.projectionMatrix)
      .multiply(mirror.matrixWorldInverse)
      .multiply(water.matrixWorld);
    const previousTarget = renderer.getRenderTarget();
    const previousShadowUpdate = renderer.shadowMap.autoUpdate;
    const previousXr = renderer.xr.enabled;
    water.visible = false;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(target);
    renderer.state.buffers.depth.setMask(true);
    renderer.clear();
    renderer.render(scene, mirror);
    renderer.setRenderTarget(previousTarget);
    renderer.shadowMap.autoUpdate = previousShadowUpdate;
    renderer.xr.enabled = previousXr;
    water.visible = true;
  };
  return {
    mesh: water,
    update(time: number) { material.uniforms.time.value = time; },
    dispose() {
      target.dispose();
      water.geometry.dispose();
      material.dispose();
    },
  };
}
