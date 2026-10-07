/* Puente de Three.js (v1.1): carga la versión moderna como módulo y la expone en window.THREE
 * para los módulos de la app, que son scripts clásicos. Se ejecuta antes de DOMContentLoaded.
 */
import * as THREE from 'three';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { RoomEnvironment } from '../../vendor/three/RoomEnvironment.js';

window.THREE = Object.assign({}, THREE, { OrbitControls, RoomEnvironment });
