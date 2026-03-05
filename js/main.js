// main.js -- The entry point. Wires everything together and runs the game loop.

import { World } from "./world.js";
import { Simulation } from "./simulation.js";
import { Renderer } from "./renderer.js";
import { Stats } from "./stats.js";
import { Charts } from "./charts.js";
import { UI } from "./ui.js";

let animationId = null;

function start() {
  // Cancel any existing game loop
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  const canvas = document.getElementById("world-canvas");
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  const world = new World();
  world.initialize();

  const simulation = new Simulation(world);
  const renderer = new Renderer(canvas, world);
  const stats = new Stats();
  const charts = new Charts(stats);

  // Restart callback re-initializes the simulation
  const ui = new UI(simulation, () => start());

  simulation.running = true;
  document.getElementById("btn-play-pause").textContent = "Pause";

  function gameLoop() {
    if (simulation.running) {
      for (let i = 0; i < simulation.ticksPerFrame; i++) {
        simulation.tick();
        stats.update(world);
      }
    }

    renderer.draw();
    charts.drawAll();
    animationId = requestAnimationFrame(gameLoop);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// Start once the page has loaded
window.addEventListener("DOMContentLoaded", start);
