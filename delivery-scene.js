import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export class DeliveryScene {
 constructor(scene){this.scene=scene;this.cups=new Map();this.ready=false;this.cupLoad=new GLTFLoader().loadAsync('/assets/models/ready/softdrink.glb').then(g=>{const b=new THREE.Box3().setFromObject(g.scene),c=b.getCenter(new THREE.Vector3());g.scene.position.set(-c.x,-b.max.y,-c.z);const root=new THREE.Group();root.scale.setScalar(.7/(b.max.y-b.min.y));root.add(g.scene);this.cupTemplate=root;});this.load=new GLTFLoader().loadAsync('/assets/models/ready/scooter.glb').then(g=>{const b=new THREE.Box3().setFromObject(g.scene),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());g.scene.position.set(-center.x,-b.min.y,-center.z);this.scooter=new THREE.Group();this.scooter.add(g.scene);this.scooter.scale.setScalar(2.2/Math.max(size.x,size.z));g.scene.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});this.scooter.visible=false;scene.add(this.scooter);this.ready=true;});}
 cup(){return this.cupTemplate?.clone(true);}
 update(d,players,now){
 const show=d&&d.phase!=='waiting'&&now<d.servedAt+3500;
 if(this.scooter){this.scooter.visible=!!show;if(show){const t=Math.max(0,(now-d.startedAt)/1000);let p,next;
 if(t<2){p=new THREE.Vector3(-14+7*t,0,-7);next=p.clone().add(new THREE.Vector3(1,0,0))}else if(t<10){const angle=(t-2)/8*Math.PI*2;p=new THREE.Vector3(Math.sin(angle)*7,0,-Math.cos(angle)*7);next=new THREE.Vector3(Math.sin(angle+.02)*7,0,-Math.cos(angle+.02)*7)}else{p=new THREE.Vector3((t-10)*4,0,-7);next=p.clone().add(new THREE.Vector3(1,0,0))}this.scooter.position.copy(p);this.scooter.rotation.y=Math.atan2(p.x-next.x,p.z-next.z);}}
 const ids=new Set(d&&now>=d.servedAt&&now<d.endsAt?d.orders.map(o=>o.playerId):[]);
 for(const [id,cup] of this.cups){if(!ids.has(id)||!players.has(id)){cup.removeFromParent();this.cups.delete(id)}}
 for(const id of ids){const entry=players.get(id);if(!entry)continue;let cup=this.cups.get(id);if(!cup){cup=this.cup();if(!cup)continue;this.scene.add(cup);this.cups.set(id,cup)}const mouth=entry.model.getObjectByName('BN_Mouth_01');if(mouth){mouth.getWorldPosition(cup.position);const forward=new THREE.Vector3(.25,0,0).applyQuaternion(entry.root.quaternion);cup.position.add(forward);cup.quaternion.copy(entry.root.quaternion)}else{cup.position.copy(entry.root.position);cup.position.y+=1.8;}}
 }
}
