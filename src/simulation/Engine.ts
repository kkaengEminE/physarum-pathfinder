import { PhysarumAgent } from './PhysarumAgent';
import { TrailGrid } from './TrailGrid';

export class SimulationEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private agents: PhysarumAgent[] = [];
  private grid!: TrailGrid;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private bgImage: HTMLImageElement | null = null;

  public currentTool: string = 'food';

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.grid = new TrailGrid(this.canvas.width, this.canvas.height);
    this.setupInteractions();
    this.setupMapUpload();
  }

  private resizeCanvas() {
    const container = this.canvas.parentElement!;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  public initSimulation() {
    this.resizeCanvas();
    this.grid = new TrailGrid(this.canvas.width, this.canvas.height);
    this.agents = [];
    this.updateStats();
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update() {
    this.grid.update();

    for (const agent of this.agents) {
      agent.update(this.grid);
    }

    this.updateStats();
  }

  private updateStats() {
    document.getElementById('stat-particles')!.innerText = this.agents.length.toString();
    document.getElementById('stat-food')!.innerText = this.grid.foodSources.length.toString();

    const foodCount = this.grid.foodSources.length;
    if (foodCount < 2) {
      document.getElementById('stat-efficiency')!.innerText = '0%';
      return;
    }

    let connectedPairs = 0;
    const totalPairs = (foodCount * (foodCount - 1)) / 2;

    for (let i = 0; i < foodCount; i++) {
      for (let j = i + 1; j < foodCount; j++) {
        const a = this.grid.foodSources[i];
        const b = this.grid.foodSources[j];
        if (this.checkConnection(a.x, a.y, b.x, b.y)) {
          connectedPairs++;
        }
      }
    }

    const efficiency = totalPairs > 0
      ? Math.floor((connectedPairs / totalPairs) * 100)
      : 0;
    document.getElementById('stat-efficiency')!.innerText = `${efficiency}%`;
  }

  private checkConnection(x1: number, y1: number, x2: number, y2: number): boolean {
    const steps = 20;
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;
    let connected = 0;

    for (let s = 0; s <= steps; s++) {
      const sx = x1 + dx * s;
      const sy = y1 + dy * s;
      const idx = this.grid.getIndex(sx, sy);
      if (idx !== -1 && this.grid.trailMap[idx] > 0.3) {
        connected++;
      }
    }

    return connected > steps * 0.5;
  }

  private spawnSeed(x: number, y: number) {
    const count = Math.min(200, 5000 - this.agents.length);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 15;
      this.agents.push(new PhysarumAgent(
        x + Math.cos(angle) * r,
        y + Math.sin(angle) * r,
        Math.random() * Math.PI * 2
      ));
    }
  }

  private render() {
    this.ctx.fillStyle = '#FAF8F5';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.bgImage) {
      this.ctx.globalAlpha = 0.3;
      this.ctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalAlpha = 1.0;
    }

    this.grid.draw(this.ctx);

    for (const agent of this.agents) {
      agent.draw(this.ctx);
    }
  }

  private setupMapUpload() {
    const mapInput = document.getElementById('map-input') as HTMLInputElement;
    const removeBtn = document.getElementById('btn-remove-map')!;

    mapInput.addEventListener('change', () => {
      const file = mapInput.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.bgImage = img;
          removeBtn.classList.remove('hidden');
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      mapInput.value = '';
    });

    removeBtn.addEventListener('click', () => {
      this.bgImage = null;
      removeBtn.classList.add('hidden');
    });
  }

  private setupInteractions() {
    let isDrawing = false;

    const handleAction = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.currentTool === 'food') {
        this.grid.addFood(x, y);
      } else if (this.currentTool === 'seed') {
        this.spawnSeed(x, y);
      } else if (this.currentTool === 'wall') {
        for (let dx = -8; dx <= 8; dx += 4) {
          for (let dy = -8; dy <= 8; dy += 4) {
            this.grid.setObstacle(x + dx, y + dy, true);
          }
        }
      } else if (this.currentTool === 'light') {
        this.grid.applyLight(x, y, 30);
        for (const agent of this.agents) {
          const dist = Math.sqrt((agent.position.x - x) ** 2 + (agent.position.y - y) ** 2);
          if (dist < 30) {
            const awayAngle = Math.atan2(agent.position.y - y, agent.position.x - x);
            agent.angle = awayAngle + (Math.random() - 0.5) * 0.5;
          }
        }
      } else if (this.currentTool === 'moisture') {
        this.grid.addMoisture(x, y, 25);
      } else if (this.currentTool === 'remove-food') {
        this.grid.removeFoodAt(x, y);
      }
    };

    this.canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      handleAction(e);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isDrawing) handleAction(e);
    });

    window.addEventListener('mouseup', () => {
      isDrawing = false;
    });
  }
}
