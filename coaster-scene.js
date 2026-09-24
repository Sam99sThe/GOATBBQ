import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {inPlaceClip} from './elephant-motion.js';

export async function addCoaster(scene,loader,elephant){
 const g=await loader.loadAsync('/assets/models/ready/coaster.glb'),root=g.scene;
 root.updateMatrixWorld(true);
 // Repeated support beams share one instanced draw call per material.
 const batches=new Map();root.traverse(n=>{if(n.isMesh){const key=n.geometry.uuid+':'+n.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(n);}});
 for(const meshes of batches.values()){if(meshes.length<2)continue;const batch=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);meshes.forEach((m,i)=>{batch.setMatrixAt(i,m.matrixWorld);m.removeFromParent()});root.add(batch);}
 const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3());
 const stage=new THREE.Group();stage.scale.setScalar(.18);stage.position.z=-42;root.position.set(-center.x,-box.min.y,-center.z);stage.add(root);scene.add(stage);
 const anchor=root.getObjectByName('ElephantRideAnchor');
 const model=clone(elephant.scene),eb=new THREE.Box3().setFromObject(model),ec=eb.getCenter(new THREE.Vector3());
 const normalized=new THREE.Group();model.position.set(-ec.x,-eb.min.y,-ec.z);normalized.add(model);normalized.scale.setScalar(2.8/.18/(eb.max.y-eb.min.y));normalized.rotation.y=-Math.PI/2;anchor.add(normalized);
 const seat=new THREE.Mesh(new THREE.BoxGeometry(15,2,12),new THREE.MeshStandardMaterial({color:0xefbb64,roughness:.65}));seat.position.y=-1;anchor.add(seat);
 const route=new THREE.AnimationMixer(root),idle=new THREE.AnimationMixer(model);if(g.animations[0])route.clipAction(g.animations[0]).play();if(elephant.animations[0])idle.clipAction(inPlaceClip(elephant.animations[0])).play();
 return {update(dt){route.update(dt);idle.update(dt)}};
}
