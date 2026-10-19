import * as THREE from 'three';
import type { Kit } from './kit.ts';

export function createPackageMaterials(kit: Kit, colors: string[]) {
  return colors.map((color, i) => {
    const texture = kit.paint(192, 256, ctx => {
      ctx.fillStyle = '#f3ead4'; ctx.fillRect(0,0,192,256);
      ctx.fillStyle = color;
      if (i%3===0) { ctx.beginPath();ctx.moveTo(0,110);ctx.quadraticCurveTo(90,10,192,110);ctx.lineTo(192,256);ctx.lineTo(0,256);ctx.fill(); }
      else if(i%3===1) { ctx.fillRect(0,0,42,256);ctx.fillRect(150,0,42,256); }
      else { ctx.beginPath();ctx.moveTo(0,150);ctx.lineTo(192,70);ctx.lineTo(192,256);ctx.lineTo(0,256);ctx.fill(); }
      ctx.fillStyle = '#304f50';ctx.textAlign='center';ctx.font='bold 32px sans-serif';
      ctx.fillText(['焙じ茶','緑の茶','うま塩','天然水','MILK','珈琲'][i],96,68,166);
      ctx.fillStyle = i%3===1 ? color : '#fff2ce';
      ctx.beginPath();ctx.ellipse(96,142,34,43,-0.45,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff5de';ctx.font='bold 15px sans-serif';ctx.fillText(['ROAST TEA','GREEN TEA','POTATO','SODA WATER','FRESH MILK','CAFE AU LAIT'][i],96,212,174);
      ctx.fillStyle='#52645b';for(let j=0;j<23;j++)ctx.fillRect(45+j*4,231,1+(j%2),14-(j%3));
      ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2;ctx.strokeRect(4,4,184,248);
    });
    return new THREE.MeshBasicMaterial({map:texture});
  });
}

export function createPillowBag() {
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  const nu=16,nv=8;
  for(let y=0;y<=nv;y++) {
    const v=y/nv;
    const swelling=Math.pow(Math.sin(v*Math.PI),0.45);
    for(let x=0;x<=nu;x++) {
      const a=x/nu*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      const width=0.073*(0.91+0.09*Math.sin(v*Math.PI));
      positions.push(Math.sign(c)*Math.pow(Math.abs(c),0.65)*width,v*0.19+0.01,
        Math.sign(s)*Math.pow(Math.abs(s),0.65)*(0.004+0.038*swelling));
      uvs.push(x/nu,v);
    }
  }
  for(let y=0;y<nv;y++)for(let x=0;x<nu;x++) {const a=y*(nu+1)+x,b=a+nu+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function addCoffeePoster(kit:Kit,parent:THREE.Object3D) {
  const texture=kit.paint(512,720,ctx=>{
    ctx.fillStyle='#f4e6cb';ctx.fillRect(0,0,512,720);
    ctx.fillStyle='#526f62';ctx.fillRect(25,25,462,6);
    ctx.textAlign='center';ctx.fillStyle='#37584f';ctx.font='28px sans-serif';ctx.fillText('雨の日も、あたたかく。',256,83);
    ctx.font='bold 83px serif';ctx.fillText('ほっと、一杯。',256,183,455);
    ctx.fillStyle='#c48f69';ctx.beginPath();ctx.ellipse(261,505,168,29,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fffaf0';ctx.lineWidth=28;ctx.beginPath();ctx.arc(355,368,56,-1.5,1.5);ctx.stroke();
    ctx.fillStyle='#fff7e6';ctx.beginPath();ctx.moveTo(134,326);ctx.lineTo(166,479);ctx.quadraticCurveTo(253,532,335,476);ctx.lineTo(363,326);ctx.closePath();ctx.fill();
    ctx.fillStyle='#5c3e2b';ctx.beginPath();ctx.ellipse(249,330,113,24,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d3bea1';ctx.lineWidth=8;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(200+i*48,290);ctx.bezierCurveTo(165+i*48,250,245+i*48,230,211+i*48,205);ctx.stroke();}
    ctx.fillStyle='#426858';ctx.font='bold 34px sans-serif';ctx.fillText('淹れたて COFFEE',256,581);
    ctx.fillStyle='#b67860';ctx.font='bold 58px serif';ctx.fillText('¥120',256,652);
    ctx.fillStyle='#87ac9b';ctx.fillRect(0,692,512,28);
  });
  kit.roundedBox([-3.54,2.07,1.325],[0.82,1.16,0.024],'#d2c9b2',0.018,parent);
  const poster=kit.mesh(new THREE.PlaneGeometry(0.77,1.09),new THREE.MeshBasicMaterial({map:texture}),[-3.54,2.07,1.342],parent);
  poster.castShadow=false;
  for(const x of [-3.8,-3.28]){const tape=kit.box([x,2.61,1.348],[0.11,0.055,0.004],'#d0c2a3',parent);tape.rotation.z=x< -3.5 ? .14:-.11;}
}
