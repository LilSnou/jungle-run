/**
 * main.js — точка входа: собирает всё вместе и запускает цикл.
 * Здесь нет логики игры — только «сборка» объектов (composition root).
 */
(function () {
  const canvas = document.getElementById('game');
  const input = new Input();
  const game = new Game(canvas, input);

  // для отладки и headless-тестов
  window.JungleRun = game;

  // запрещаем контекстное меню и «pull-to-refresh» на канвасе
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => e.preventDefault(), { passive: false });

  game.start();
})();
