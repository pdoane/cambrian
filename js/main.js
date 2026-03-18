// main.js -- The entry point. Wires everything together and runs the game loop.

import { World } from "./world.js";
import { Simulation } from "./simulation.js";
import { Renderer } from "./renderer.js";
import { Stats } from "./stats.js";
import { Charts } from "./charts.js";
import { UI, getLaunchConfig } from "./ui.js";

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

  // Only initialize the world if there are species to launch
  const config = getLaunchConfig();
  const releases = config.releases;
  const launched = releases.length > 0;
  if (launched) {
    world.initialize(releases);
  }

  const simulation = new Simulation(world);
  const renderer = new Renderer(canvas, world);
  const stats = new Stats();
  const charts = new Charts(stats);

  const ui = new UI(simulation, () => start());

  simulation.running = launched;
  document.getElementById("btn-play-pause").textContent = launched ? "Pause" : "Play";

  let frameCount = 0;

  function gameLoop() {
    frameCount++;
    if (simulation.running) {
      const speed = simulation.speed;
      if (speed >= 1) {
        // speed 1+ = that many ticks per frame
        for (let i = 0; i < speed; i++) {
          simulation.tick();
          stats.update(world);
        }
      } else {
        // speed < 1 = tick every N frames
        const interval = Math.round(1 / speed);
        if (frameCount % interval === 0) {
          simulation.tick();
          stats.update(world);
        }
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
