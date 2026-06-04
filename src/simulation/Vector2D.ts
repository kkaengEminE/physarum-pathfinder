export class Vector2D {
  constructor(public x: number = 0, public y: number = 0) {}

  set(x: number, y: number): this {
    this.x = x; this.y = y; return this;
  }

  add(v: Vector2D): this {
    this.x += v.x; this.y += v.y; return this;
  }

  sub(v: Vector2D): this {
    this.x -= v.x; this.y -= v.y; return this;
  }

  mult(n: number): this {
    this.x *= n; this.y *= n; return this;
  }

  div(n: number): this {
    if (n !== 0) { this.x /= n; this.y /= n; }
    return this;
  }

  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): this {
    const m = this.mag();
    if (m !== 0) this.div(m);
    return this;
  }

  limit(max: number): this {
    if (this.mag() > max) {
      this.normalize().mult(max);
    }
    return this;
  }

  heading(): number {
    return Math.atan2(this.y, this.x);
  }

  copy(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  dist(v: Vector2D): number {
    return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
  }
}
