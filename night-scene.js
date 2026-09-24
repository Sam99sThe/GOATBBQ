import * as THREE from 'three';

export function addNightScenery(scene){
 const set=new THREE.Group();set.name='Night campsite';scene.add(set);
 const wood=new THREE.MeshStandardMaterial({color:0x4f3f32,roughness:1});
 const foliage=[0x173d37,0x214941,0x285249].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
 let seed=54;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<26;i++){
  const angle=i/26*Math.PI*2,r=19+random()*10,x=Math.sin(angle)*r,z=Math.cos(angle)*r;
  if(z< -7&&Math.abs(x)<12)continue;
  const height=4+random()*4;const tree=new THREE.Group();tree.position.set(x,0,z);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.3,height*.55,7),wood);trunk.position.y=height*.27;tree.add(trunk);
  for(let j=0;j<3;j++){const crown=new THREE.Mesh(new THREE.ConeGeometry((height*.23)*(1-j*.18),height*.48,8),foliage[(i+j)%3]);crown.position.y=height*(.43+j*.18);tree.add(crown)}set.add(tree);
 }
 const poles=[[-9,7,-7],[9,7,-7],[-9,6,6],[9,6,6]];
 const poleMat=new THREE.MeshStandardMaterial({color:0x484d49,metalness:.65,roughness:.5});
 for(const [x,y,z] of poles){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,y,10),poleMat);pole.position.set(x,y/2,z);set.add(pole)}
 const cableMat=new THREE.MeshBasicMaterial({color:0x243c45});const bulbMat=new THREE.MeshStandardMaterial({color:0xffe0ac,emissive:0xffb957,emissiveIntensity:5,roughness:.5});
 for(const [a,b] of [[0,1],[0,2],[1,3]]){
  const start=new THREE.Vector3(...poles[a]),end=new THREE.Vector3(...poles[b]);const points=[];
  for(let j=0;j<=40;j++){const t=j/40,p=start.clone().lerp(end,t);p.y-=Math.sin(t*Math.PI)*.85;points.push(p)}
  set.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),40,.018,4,false),cableMat));
  for(let j=1;j<10;j++){const t=j/10,p=start.clone().lerp(end,t);p.y-=Math.sin(t*Math.PI)*.85+.12;const bulb=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),bulbMat);bulb.position.copy(p);set.add(bulb)}
 }
 for(const [x,z] of [[-7,-5],[7,-5],[-7,5],[7,5]]){const light=new THREE.PointLight(0xffc68a,85,19,2);light.position.set(x,5,z);set.add(light)}
 const moon=new THREE.Mesh(new THREE.SphereGeometry(1.5,24,16),new THREE.MeshBasicMaterial({color:0xffefd0}));moon.position.set(-24,31,-43);set.add(moon);
 const vertices=[];for(let i=0;i<240;i++){const theta=random()*Math.PI*2,alt=.16+random()*1.23,r=65;vertices.push(Math.cos(theta)*Math.cos(alt)*r,Math.sin(alt)*r,Math.sin(theta)*Math.cos(alt)*r)}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xd8e9ff,size:.09,sizeAttenuation:true,transparent:true,opacity:.8,fog:false}));set.add(stars);
 return set;
}
