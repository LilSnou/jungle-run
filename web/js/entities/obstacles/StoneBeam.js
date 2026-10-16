/**
 * StoneBeam — упавшая каменная балка колонны в храме майя. Наследует
 * LowLog: подвешена на ЦЕПЯХ к потолку — проскальзывай или получай урон.
 *
 * Арт 48x16 (масштаб 0.5) = 24x8 — визуал совпадает с хитбоксом,
 * как в Godot StoneBeam.
 */
class StoneBeam extends LowLog {
  constructor(x) {
    super(x, 'stonebeam', 24, 8);
    this.ropeColor = '#565b63';
    this.isChain = true;
  }
}
