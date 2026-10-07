/**
 * Springs tuned to feel like iOS: UIKit's default spring settles in ~0.4s with a damping ratio of
 * ~0.85 (a hint of overshoot, no wobble). Converted to RN Animated's physical parameters:
 * stiffness = (2π / response)² · mass, damping = 4π · ratio · mass / response.
 */
export const SPRING = { stiffness: 250, damping: 27, mass: 1 } as const;

/** Faster and a little firmer — for press feedback, where 0.4s would feel sluggish. */
export const SPRING_PRESS = { stiffness: 420, damping: 32, mass: 1 } as const;
