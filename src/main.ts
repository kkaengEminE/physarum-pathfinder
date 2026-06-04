import { SimulationEngine } from './simulation/Engine';

document.addEventListener('DOMContentLoaded', () => {
  const menuScreen = document.getElementById('menu-screen')!;
  const aboutModal = document.getElementById('about-modal')!;
  const simInterface = document.getElementById('sim-interface')!;

  const btnStart = document.getElementById('btn-start')!;
  const btnAbout = document.getElementById('btn-about')!;
  const btnCloseAbout = document.getElementById('btn-close-about')!;
  const btnBackMenu = document.getElementById('btn-back-menu')!;

  const toolButtons = document.querySelectorAll('.tool-btn');

  const engine = new SimulationEngine('sim-canvas');

  btnAbout.addEventListener('click', () => aboutModal.classList.remove('hidden'));
  btnCloseAbout.addEventListener('click', () => aboutModal.classList.add('hidden'));

  btnStart.addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    simInterface.classList.remove('hidden');

    engine.initSimulation();
    engine.start();
  });

  btnBackMenu.addEventListener('click', () => {
    engine.stop();
    simInterface.classList.add('hidden');
    menuScreen.classList.remove('hidden');
  });

  toolButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      toolButtons.forEach(b => b.classList.remove('active'));
      const target = e.currentTarget as HTMLButtonElement;
      target.classList.add('active');

      const selectedTool = target.getAttribute('data-tool');
      if (selectedTool) {
        engine.currentTool = selectedTool;
      }
    });
  });
});
