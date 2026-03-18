// shapes.js -- Shared creature shape rendering.
// Used by renderer.js (world canvas), legend, and ui.js (spawn list icons).

/**
 * Draw a creature body shape.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - center x
 * @param {number} y - center y
 * @param {number} r - radius
 * @param {number} sides - polygon sides (0 = circle, 3+ = polygon)
 */
export function drawBody(ctx, x, y, r, sides) {
  if (sides >= 3) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
}

/**
 * Draw a gender/age symbol inside a creature (white fill, black stroke outline).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - center x
 * @param {number} y - center y
 * @param {number} r - body radius (symbol scales relative to this)
 * @param {"male"|"female"} gender
 * @param {number} growthProgress - 0..1, < 1 means child
 */
export function drawGenderSymbol(ctx, x, y, r, gender, growthProgress) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const ss = r * 0.55;
  const symLw = Math.max(2, r * 0.25);

  // Build the path
  ctx.beginPath();
  if (growthProgress < 1.0) {
    // Child: small circle
    ctx.arc(x, y, ss * 0.55, 0, Math.PI * 2);
  } else if (gender === "male") {
    // Upward chevron ^
    ctx.moveTo(x - ss, y + ss * 0.35);
    ctx.lineTo(x, y - ss * 0.55);
    ctx.lineTo(x + ss, y + ss * 0.35);
  } else {
    // Downward chevron v
    ctx.moveTo(x - ss, y - ss * 0.35);
    ctx.lineTo(x, y + ss * 0.55);
    ctx.lineTo(x + ss, y - ss * 0.35);
  }

  // Black outline then white stroke
  ctx.lineWidth = symLw + 1.5;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.stroke();
  ctx.lineWidth = symLw;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.stroke();
}
