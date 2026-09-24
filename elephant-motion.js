import * as THREE from 'three';

export const MOTION_SECONDS=3.4;
export function inPlaceClip(source){
 const clip=source.clone();
 for(const track of clip.tracks){if(track.name==='Bip01.position')for(let i=3;i<track.values.length;i++)track.values[i]=track.values[i%3]}
 return clip;
}
export function motionOffsets(kind,seconds){
 if(seconds<=0||seconds>=MOTION_SECONDS)return [];
 const envelope=Math.sin(Math.PI*seconds/MOTION_SECONDS)**2;
 const wave=Math.sin(seconds*Math.PI*2.1)*envelope;
 if(kind==='greet')return [['BN_Nose_01','z',-.2*envelope],['BN_Nose_02','z',-.32*envelope],['BN_Nose_03','z',-.38*envelope],['BN_Nose_04','y',wave*.28],['BN_Nose_05','y',wave*.22]];
 if(kind==='ears')return [['BN_Ear_L_01','y',wave*.36],['BN_Ear_R_01','y',-wave*.36],['BN_Ear_L_02','z',wave*.17],['BN_Ear_R_02','z',-wave*.17]];
 if(kind==='nod')return [['Bip01_Head','z',wave*.16],['Bip01_Neck','z',wave*.05]];
 return [];
}
export function animateElephant(entry,dt){
 for(const [bone,q] of entry.poseBase||[])bone.quaternion.copy(q);
 entry.poseBase=[];
 entry.mixer?.update(dt);
 if(!entry.motion)return;
 entry.motion.elapsed+=dt;
 if(entry.motion.elapsed>=MOTION_SECONDS){entry.motion=null;return}
 for(const [name,axis,angle] of motionOffsets(entry.motion.kind,entry.motion.elapsed)){
  const bone=entry.model.getObjectByName(name);if(!bone)continue;
  entry.poseBase.push([bone,bone.quaternion.clone()]);
  bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(axis==='x'?1:0,axis==='y'?1:0,axis==='z'?1:0),angle));
 }
}
