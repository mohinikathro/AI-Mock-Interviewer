"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const ThreeDAvatar = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0); // Transparent background
    
    if (mountRef.current) {
      renderer.setSize(window.innerWidth, window.innerHeight);
      mountRef.current.appendChild(renderer.domElement);
    }

    // Create glowing nucleus (with emissive glow)
    const nucleusGeometry = new THREE.SphereGeometry(1, 32, 32);
    const nucleusMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 5,  // Glow intensity
      roughness: 0.4,
      metalness: 0.7,
    });
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    scene.add(nucleus);

    // Add Point Light to enhance glow
    const light = new THREE.PointLight(0x00ffcc, 2, 50);
    light.position.set(0, 0, 0);  // Centered on the nucleus
    scene.add(light);

    // Create glowing electrons and their trails
    const electronGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const electronMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 2,  // Glow intensity
      roughness: 0.4,
      metalness: 0.7,
    });

    const electronCount = 6; // Add more electrons
    const electrons: THREE.Mesh[] = [];
    const trails: THREE.Line[] = [];

    // Creating the electrons and trails
    for (let i = 0; i < electronCount; i++) {
      const electron = new THREE.Mesh(electronGeometry, electronMaterial);
      const distance = 2 + i * 0.3;
      electron.position.x = distance;
      scene.add(electron);
      electrons.push(electron);

      // Create a trail for each electron
      const trailMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffcc,
        opacity: 0.3,
        transparent: true,
      });
      const trailGeometry = new THREE.BufferGeometry().setFromPoints([electron.position, electron.position]);
      const trail = new THREE.Line(trailGeometry, trailMaterial);
      scene.add(trail);
      trails.push(trail);
    }

    // Set camera position
    camera.position.z = 6;

    // Animate electrons revolving in 3D space and creating trails
    const animate = () => {
      requestAnimationFrame(animate);

      // Update positions of electrons and trails
      electrons.forEach((electron, index) => {
        const time = Date.now() * 0.0005 + index * 2; // Slow down movement
        const radius = 2 + index * 0.3;
        
        // Electron movement in all directions (3D)
        electron.position.x = Math.cos(time) * radius;
        electron.position.y = Math.sin(time) * radius;
        electron.position.z = Math.cos(time * 0.7) * radius;

        // Update the trail positions
        const trail = trails[index];
        const positions = trail.geometry.attributes.position.array as number[];
        positions[0] = electron.position.x;
        positions[1] = electron.position.y;
        positions[2] = electron.position.z;
        positions[3] = electron.position.x;
        positions[4] = electron.position.y;
        positions[5] = electron.position.z;
        trail.geometry.attributes.position.needsUpdate = true;

        // Fade out trail
        trail.material.opacity = Math.max(0.05, trail.material.opacity - 0.005); // Disappear effect
      });

      // Update the scene
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resizing
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onWindowResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", onWindowResize);

      // Proper cleanup of Three.js objects
      electrons.forEach((electron) => {
        electron.geometry.dispose();
        electron.material.dispose();
      });
      trails.forEach((trail) => {
        trail.geometry.dispose();
        trail.material.dispose();
      });
      nucleusGeometry.dispose();
      nucleusMaterial.dispose();
      light.dispose();
    };
  }, []);

  return <div ref={mountRef} />;
};

export default ThreeDAvatar;
