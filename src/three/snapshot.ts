// Renders the character's head to a small picture for the profile circle.
import * as THREE from "three";
import { DressedStyle } from "../character";
import { addLights, buildHuman } from "./human";

const SIZE = 192;
const cache = new Map<string, string>();
let renderer: THREE.WebGLRenderer | null = null;

export function faceImage(style: DressedStyle): string {
  const key = JSON.stringify(style);
  const hit = cache.get(key);
  if (hit) return hit;

  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
  }
  const scene = new THREE.Scene();
  addLights(scene);
  const human = buildHuman(style);
  human.head.rotation.set(0, 0, 0);
  scene.add(human.root);
  scene.updateMatrixWorld(true);

  const target = new THREE.Vector3();
  human.head.getWorldPosition(target);
  target.y += 0.035;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 10);
  camera.position.set(target.x + 0.14, target.y + 0.03, target.z + 1.0);
  camera.lookAt(target);

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  human.dispose();
  cache.set(key, url);
  return url;
}

// A picture of one wardrobe item, worn on a plain character, framed on the part of the body it goes on.
const ITEM_SIZE = 256;
const itemCache = new Map<string, string>();
let itemRenderer: THREE.WebGLRenderer | null = null;
const NEUTRAL: DressedStyle = {
  body: "male", primaryColor: "#8a8b80", secondaryColor: "#3d3d3d", skinColor: "#a0662f", hairColor: "#17120f", hair: "short", hat: "none", accessory: "none",
};

export function itemImage(key: string, slot: string): string {
  const hit = itemCache.get(key);
  if (hit) return hit;
  if (!itemRenderer) {
    itemRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    itemRenderer.setPixelRatio(1);
    itemRenderer.setSize(ITEM_SIZE, ITEM_SIZE, false);
  }
  const style: DressedStyle = { ...NEUTRAL, items: [{ key, slot }] };
  if (slot === "hat") style.hat = key;
  if (slot === "accessory") style.accessory = key;
  const scene = new THREE.Scene();
  addLights(scene);
  const human = buildHuman(style);
  human.update(0.6);
  if (slot === "back") human.root.rotation.y = Math.PI * 0.82; // show the back
  scene.add(human.root);
  scene.updateMatrixWorld(true);

  const head = new THREE.Vector3();
  human.head.getWorldPosition(head);
  // [where to look (relative to the head), distance, field of view]
  const frame: Record<string, [number, number, number]> = {
    hat: [0.07, 0.95, 24], accessory: [0.0, 0.95, 24], neck: [-0.22, 1.15, 24],
    outfit: [-0.5, 2.0, 24], back: [-0.5, 2.7, 24], aura: [-0.6, 3.5, 26],
  };
  // a few items sit somewhere other than their slot's usual spot
  const special: Record<string, [number, number, number]> = { wristband: [-0.62, 1.5, 24], pioneer_pin: [-0.4, 1.3, 24] };
  const [dy, dist, fov] = special[key] ?? frame[slot] ?? frame.outfit;
  const target = new THREE.Vector3(0, head.y + dy, 0);
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 20);
  camera.position.set(target.x + 0.12 * (dist > 1.5 ? 0 : 1), target.y + 0.04, dist);
  camera.lookAt(target);

  itemRenderer.render(scene, camera);
  const url = itemRenderer.domElement.toDataURL("image/png");
  human.dispose();
  itemCache.set(key, url);
  return url;
}
