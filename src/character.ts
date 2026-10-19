import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Kit } from './kit.ts';
import characterBytes from './assets/night-visitor.glb';
import idleBytes from './assets/visitor-idle.glb';

// Microsoft Rocketbox adult f011, MIT. The complete license is embedded in the GLB.
// Model, animation, decoder and textures are bundled inside the single HTML.
export function createNightVisitor(kit: Kit) {
  const figure = new THREE.Group();
  figure.name = 'adult-night-visitor';
  figure.userData.dynamic = true;
  figure.position.set(.92,.36,1.82);
  figure.rotation.y = .42;
  kit.root.add(figure);
  kit.point([.25,2.45,3.25],'#ffe0ba',.65,3.6);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let animate = (_delta:number,_time:number,_reduced:boolean) => {};
  const parse = (bytes:Uint8Array) => loader.parseAsync(bytes.slice().buffer as ArrayBuffer,'');
  const ready = Promise.all([parse(characterBytes),parse(idleBytes)]).then(([gltf,idle]) => {
    const model=gltf.scene;
    model.name='rocketbox-adult-f011';
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model,true);
    const scale=1.76/bounds.getSize(new THREE.Vector3()).y;
    model.scale.setScalar(scale);
    model.position.y=-bounds.min.y*scale;
    figure.add(model);
    model.updateMatrixWorld(true);
    model.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      object.castShadow=true;object.receiveShadow=true;object.frustumCulled=false;
      for(const material of Array.isArray(object.material)?object.material:[object.material]) {
        if(material instanceof THREE.MeshStandardMaterial) {
          material.roughness=Math.max(material.roughness,.72);
          material.envMapIntensity=.6;
          material.normalScale.multiplyScalar(.3);
          if(material.map){material.map.anisotropy=8;kit.textures.add(material.map);}
          if(material.normalMap)kit.textures.add(material.normalMap);
        }
      }
    });
    const bone=(name:string) => {
      const b=model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('Bip01 '+name));
      if(!b)throw new Error('Missing visitor bone: '+name);
      return b;
    };
    const mixer=new THREE.AnimationMixer(model);
    if(idle.animations[0])mixer.clipAction(idle.animations[0]).play();
    const upperR=bone('R UpperArm'),lowerR=bone('R Forearm'),handR=bone('R Hand');
    const upperL=bone('L UpperArm'),lowerL=bone('L Forearm'),handL=bone('L Hand');
    const head=bone('Head');
    const bones=[upperR,lowerR,handR,upperL,lowerL,handL,head];
    const rest=new Map(bones.map(b=>[b,b.quaternion.clone()]));
    const restFingers=new Map<THREE.Object3D,THREE.Quaternion>();
    for(const side of ['R','L'])for(let i=0;i<5;i++)for(const suffix of ['',String(i)+'1',String(i)+'2']) {
      const name=suffix ? side+' Finger'+suffix : side+' Finger'+i;
      const b=bone(name);restFingers.set(b,b.quaternion.clone());
    }
    const localPoint=(p:THREE.Vector3) => model.localToWorld(p.clone());
    const aim=(joint:THREE.Object3D,tip:THREE.Object3D,target:THREE.Vector3) => {
      const origin=joint.getWorldPosition(new THREE.Vector3());
      const from=tip.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
      const to=target.clone().sub(origin).normalize();
      const world=joint.getWorldQuaternion(new THREE.Quaternion());
      world.premultiply(new THREE.Quaternion().setFromUnitVectors(from,to));
      joint.quaternion.copy(joint.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
      joint.updateMatrixWorld(true);
    };
    const solveArm=(upper:THREE.Object3D,lower:THREE.Object3D,hand:THREE.Object3D,wrist:THREE.Vector3,hint:THREE.Vector3) => {
      const shoulder=upper.getWorldPosition(new THREE.Vector3());
      const elbow=lower.getWorldPosition(new THREE.Vector3());
      const palm=hand.getWorldPosition(new THREE.Vector3());
      const a=shoulder.distanceTo(elbow),b=elbow.distanceTo(palm);
      const target=localPoint(wrist),direction=target.clone().sub(shoulder);
      const distance=THREE.MathUtils.clamp(direction.length(),Math.abs(a-b)+.001,a+b-.001);
      direction.normalize();
      const along=(a*a-b*b+distance*distance)/(2*distance);
      const bend=localPoint(hint).sub(shoulder);
      bend.addScaledVector(direction,-bend.dot(direction)).normalize();
      const elbowTarget=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
      aim(upper,lower,elbowTarget);aim(lower,hand,target);
    };
    const orientHand=(hand:THREE.Object3D,direction:THREE.Vector3,palmNormal:THREE.Vector3) => {
      const rootWorld=model.getWorldQuaternion(new THREE.Quaternion());
      const x=direction.clone().normalize().applyQuaternion(rootWorld);
      const z=palmNormal.clone().normalize().applyQuaternion(rootWorld);
      const y=new THREE.Vector3().crossVectors(z,x).normalize();
      z.crossVectors(x,y).normalize();
      const world=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
      hand.quaternion.copy(hand.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
      hand.updateMatrixWorld(true);
    };
    const cigarette=new THREE.Group();handR.add(cigarette);
    cigarette.position.set(.123,-.006,.010);
    cigarette.rotation.set(Math.PI/2,.08,-.1);
    kit.rod([0,0,-.012],[0,0,.075],.0041,'#e3d9cb',cigarette);
    kit.rod([0,0,-.012],[0,0,.012],.0045,'#ad855f',cigarette);
    const emberMaterial=new THREE.MeshBasicMaterial({color:'#e6a06d'});
    const ember=kit.mesh(new THREE.SphereGeometry(.0048,10,8),emberMaterial,[0,0,.078],cigarette);
    ember.castShadow=false;
    const smokeMap=kit.paint(64,64,ctx=>{
      const g=ctx.createRadialGradient(32,32,0,32,32,32);
      g.addColorStop(0,'rgba(240,245,255,.6)');g.addColorStop(.42,'rgba(220,235,255,.24)');g.addColorStop(1,'rgba(220,235,255,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    });
    const smoke=Array.from({length:20},()=>{
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeMap,color:'#c7d3e1',transparent:true,opacity:0,depthWrite:false}));
      sprite.layers.set(2);figure.add(sprite);return sprite;
    });
    const emberPosition=new THREE.Vector3();
    animate=(delta,time,reduced) => {
      const t=reduced?0:time;
      mixer.update(reduced?0:delta*.55);
      for(const b of bones)b.quaternion.copy(rest.get(b)!);
      model.updateMatrixWorld(true);
      const inhale=(Math.sin(t*.52)+1)*.5;
      solveArm(upperR,lowerR,handR,new THREE.Vector3(-.22,1.40+inhale*.05,.20),new THREE.Vector3(-.39,1.18,.20));
      orientHand(handR,new THREE.Vector3(.55,.75,-.18),new THREE.Vector3(-.9,.3,0));
      solveArm(upperL,lowerL,handL,new THREE.Vector3(.19,.91,.03),new THREE.Vector3(.27,1.12,-.01));
      orientHand(handL,new THREE.Vector3(-.08,-1,.03),new THREE.Vector3(-1,.08,0));
      for(const [b,q]of restFingers) {
        b.quaternion.copy(q);
        const right=b.name.includes('_R_');
        const index=Number(b.name.match(/Finger(\d)/)?.[1]??0);
        const segment=b.name.match(/Finger\d(\d)/)?.[1];
        const curl=index===0?.3:index<=2?(segment==='1'?.65:segment==='2'?.35:.18):(segment?.85:.5);
        b.rotateZ(right?curl:.18);
      }
      head.rotateX(-.055+Math.sin(t*.18)*.025);
      head.rotateZ(.045);
      model.updateMatrixWorld(true);
      figure.worldToLocal(ember.getWorldPosition(emberPosition));
      emberMaterial.color.set('#d98350').multiplyScalar(1.1+Math.pow(inhale,5)*1.5);
      smoke.forEach((s,i)=>{
        s.visible=!reduced;
        const p=(t*.24+i*.618)%1;
        s.position.copy(emberPosition).add(new THREE.Vector3(Math.sin(p*6+i)*.026*p-.025*p,p*.37,p*.11));
        const size=.015+p*.14;s.scale.set(size,size*1.55,1);
        s.material.opacity=Math.sin(Math.PI*p)*.18;
        s.material.rotation=Math.sin(t*.2+i)*.4;
      });
    };
    animate(0,0,true);
  });
  return {ready,update(delta:number,time:number,reduced:boolean){animate(delta,time,reduced);}};
}
