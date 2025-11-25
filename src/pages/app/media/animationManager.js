class AnimationManager {
  tasks = new Set();
  fps = 30; // Target FPS
  lastFrameTime = performance.now();
  animationId = null; // Store the animation frame ID

  run = (currentTime) => {
    const deltaTime = currentTime - this.lastFrameTime;

    // Ensure the tasks only run if enough time has passed to meet the target FPS
    if (deltaTime > 1000 / this.fps) {
      this.tasks.forEach((task) => task(currentTime));
      this.lastFrameTime = currentTime;
    }

    this.animationId = requestAnimationFrame(this.run);
  };

  registerTask(task) {
    this.tasks.add(task);
    if (this.tasks.size === 1) {
      this.animationId = requestAnimationFrame(this.run); // Start the loop if this is the first task
    }
  }

  unregisterTask(task) {
    this.tasks.delete(task);
    if (this.tasks.size === 0 && this.animationId !== null) {
      cancelAnimationFrame(this.animationId); // Stop the loop if no tasks remain
      this.animationId = null; // Reset the ID
    }
  }
}

export const animationManager = new AnimationManager();
