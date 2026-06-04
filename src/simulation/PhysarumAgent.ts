import { Vector2D } from './Vector2D';
import { TrailGrid } from './TrailGrid';

export class PhysarumAgent {
  public position: Vector2D;
  public angle: number;

  private speed: number = 1.2;
  private sensorAngle: number = 35 * (Math.PI / 180);
  private sensorDist: number = 12;
  private turnSpeed: number = 0.4;
  private depositAmount: number = 0.6;

  constructor(x: number, y: number, angle: number) {
    this.position = new Vector2D(x, y);
    this.angle = angle;
  }

  update(grid: TrailGrid): boolean {
    const fLeft = this.sense(grid, -this.sensorAngle);
    const fCenter = this.sense(grid, 0);
    const fRight = this.sense(grid, this.sensorAngle);

    if (fCenter < 0 && fLeft < 0 && fRight < 0) {
      this.angle += (Math.random() - 0.5) * Math.PI;
      return this.move(grid);
    }

    if (fCenter > fLeft && fCenter > fRight) {
      // go straight
    } else if (fCenter < fLeft && fCenter < fRight) {
      this.angle += (Math.random() < 0.5 ? -1 : 1) * this.turnSpeed;
    } else if (fLeft > fRight) {
      this.angle -= this.turnSpeed;
    } else if (fRight > fLeft) {
      this.angle += this.turnSpeed;
    } else {
      this.angle += (Math.random() - 0.5) * 0.3;
    }

    return this.move(grid);
  }

  private sense(grid: TrailGrid, angleOffset: number): number {
    const sx = this.position.x + Math.cos(this.angle + angleOffset) * this.sensorDist;
    const sy = this.position.y + Math.sin(this.angle + angleOffset) * this.sensorDist;

    const idx = grid.getIndex(sx, sy);
    if (idx === -1 || grid.obstacleMap[idx] === 1) return -1;

    return grid.trailMap[idx] + grid.getFoodAttraction(sx, sy) * 0.5;
  }

  private move(grid: TrailGrid): boolean {
    const nx = this.position.x + Math.cos(this.angle) * this.speed;
    const ny = this.position.y + Math.sin(this.angle) * this.speed;

    if (nx < 2 || nx > grid.width - 2 || ny < 2 || ny > grid.height - 2) {
      this.angle = Math.random() * Math.PI * 2;
      return true;
    }

    if (grid.isObstacle(nx, ny)) {
      this.angle = Math.random() * Math.PI * 2;
      return true;
    }

    this.position.x = nx;
    this.position.y = ny;

    grid.addTrail(this.position.x, this.position.y, this.depositAmount);
    return true;
  }

  public scatter() {
    this.angle = Math.random() * Math.PI * 2;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(212, 168, 67, 0.7)';
    ctx.fillRect(
      this.position.x - 0.8,
      this.position.y - 0.8,
      1.6,
      1.6
    );
  }
}
