export interface FoodSource {
  x: number;
  y: number;
  strength: number;
}

export class TrailGrid {
  public width: number;
  public height: number;
  public cellSize: number = 4;
  public cols: number;
  public rows: number;

  public trailMap: Float32Array;
  public obstacleMap: Uint8Array;
  public moistureMap: Float32Array;
  public foodSources: FoodSource[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cols = Math.ceil(width / this.cellSize);
    this.rows = Math.ceil(height / this.cellSize);

    const size = this.cols * this.rows;
    this.trailMap = new Float32Array(size);
    this.obstacleMap = new Uint8Array(size);
    this.moistureMap = new Float32Array(size);
  }

  getIndex(x: number, y: number): number {
    const c = Math.floor(x / this.cellSize);
    const r = Math.floor(y / this.cellSize);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  addTrail(x: number, y: number, amount: number) {
    const idx = this.getIndex(x, y);
    if (idx !== -1 && this.obstacleMap[idx] === 0) {
      this.trailMap[idx] = Math.min(this.trailMap[idx] + amount, 8.0);
    }
  }

  setObstacle(x: number, y: number, isWall: boolean) {
    const idx = this.getIndex(x, y);
    if (idx !== -1) {
      this.obstacleMap[idx] = isWall ? 1 : 0;
      if (isWall) this.trailMap[idx] = 0;
    }
  }

  isObstacle(x: number, y: number): boolean {
    const idx = this.getIndex(x, y);
    if (idx === -1) return true;
    return this.obstacleMap[idx] === 1;
  }

  addMoisture(x: number, y: number, radius: number) {
    const startC = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const endC = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const startR = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const endR = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        const idx = r * this.cols + c;
        this.moistureMap[idx] = Math.min(this.moistureMap[idx] + 0.5, 3.0);
      }
    }
  }

  applyLight(x: number, y: number, radius: number) {
    const startC = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const endC = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const startR = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const endR = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        const idx = r * this.cols + c;
        this.trailMap[idx] *= 0.5;
      }
    }
  }

  addFood(x: number, y: number) {
    if (this.isObstacle(x, y)) return;
    this.foodSources.push({ x, y, strength: 10.0 });
  }

  removeFoodAt(x: number, y: number) {
    this.foodSources = this.foodSources.filter(
      f => Math.sqrt((f.x - x) ** 2 + (f.y - y) ** 2) > 20
    );
  }

  getFoodAttraction(x: number, y: number): number {
    let total = 0;
    for (const food of this.foodSources) {
      const dist = Math.sqrt((food.x - x) ** 2 + (food.y - y) ** 2);
      if (dist < 150) {
        total += food.strength / (1 + dist * 0.05);
      }
    }
    return total;
  }

  update() {
    const size = this.cols * this.rows;

    for (const food of this.foodSources) {
      const fc = Math.floor(food.x / this.cellSize);
      const fr = Math.floor(food.y / this.cellSize);
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          const r = fr + dr;
          const c = fc + dc;
          if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            const idx = r * this.cols + c;
            if (this.obstacleMap[idx] === 0) {
              const dist = Math.sqrt(dr * dr + dc * dc);
              this.trailMap[idx] = Math.min(
                this.trailMap[idx] + food.strength * 0.3 / (1 + dist),
                8.0
              );
            }
          }
        }
      }
    }

    const newTrail = new Float32Array(size);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        if (this.obstacleMap[idx] === 1) continue;

        let sum = 0;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
              const nIdx = nr * this.cols + nc;
              if (this.obstacleMap[nIdx] === 0) {
                sum += this.trailMap[nIdx];
                count++;
              }
            }
          }
        }

        const moistureBoost = 1.0 + this.moistureMap[idx] * 0.1;
        const diffused = count > 0 ? sum / count : 0;
        const blended = this.trailMap[idx] * 0.7 + diffused * 0.3;
        const evapRate = 0.985 * moistureBoost;
        newTrail[idx] = blended * Math.min(evapRate, 0.998);
        if (newTrail[idx] < 0.01) newTrail[idx] = 0;
      }
    }
    this.trailMap = newTrail;

    for (let i = 0; i < size; i++) {
      this.moistureMap[i] *= 0.998;
      if (this.moistureMap[i] < 0.01) this.moistureMap[i] = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        const x = c * this.cellSize;
        const y = r * this.cellSize;

        if (this.obstacleMap[idx] === 1) {
          ctx.fillStyle = '#6E6053';
          ctx.fillRect(x, y, this.cellSize, this.cellSize);
        } else {
          if (this.moistureMap[idx] > 0.05) {
            ctx.fillStyle = `rgba(100, 160, 200, ${Math.min(this.moistureMap[idx] * 0.12, 0.25)})`;
            ctx.fillRect(x, y, this.cellSize, this.cellSize);
          }
          if (this.trailMap[idx] > 0.05) {
            const intensity = Math.min(this.trailMap[idx] / 4.0, 1.0);
            const r2 = Math.floor(212 - 28 * intensity);
            const g2 = Math.floor(168 - 34 * intensity);
            const b2 = Math.floor(67 - 56 * intensity);
            ctx.fillStyle = `rgba(${r2}, ${g2}, ${b2}, ${Math.min(intensity * 0.6, 0.55)})`;
            ctx.fillRect(x, y, this.cellSize, this.cellSize);
          }
        }
      }
    }

    for (const food of this.foodSources) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(food.x, food.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#D4A843';
      ctx.fill();
      ctx.strokeStyle = '#2C2520';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(food.x, food.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#B8860B';
      ctx.fill();
      ctx.restore();
    }
  }
}
