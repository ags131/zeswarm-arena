import { getTime, getObjectsByPrototype, ATTACK, RANGED_ATTACK, RANGED_ATTACK_DISTANCE_RATE, getDistance, HEAL, StructureTower } from '/game'
import { Creep } from '/game/prototypes'
import { Flag, BodyPart } from '/arena';

import { kernel } from './kernel'

import * as roles from './roles/index'

import * as cpu from './cpu'
import { CostMatrix } from '/game/path-finder';
import { getDirection } from '/game';
import { searchPath } from '/game/path-finder';


// This is the only exported function from the main module. It is called every tick.
export function loop() {
  cpu.reset()
  console.log(getTime())
  kernel.tick()
  console.log(cpu.getUsed())
  // console.log(Object.keys(all).join('\n'))
  // console.log('' + Creep.prototype.attack)
}

kernel.createProcess('test', function * () {
  while(true) {
    this.log.info(`Tick: ${getTime()}`)
    yield
  }
})

kernel.createProcess('swarm', swarm) 

function * swarm () {
  /** @type {Creep[]} */
  const myCreeps = getObjectsByPrototype(Creep).filter(i => i.my)
  const enemyFlag = getObjectsByPrototype(Flag).find(i => !i.my)
  let hasDefender = false
  myCreeps.forEach(creep => {
    if (creep.body.some(i => i.type === ATTACK) && !hasDefender) {
      creep.role = 'defender'
      hasDefender = true
    }
    // if (creep.body.some(i => i.type === RANGED_ATTACK)) {
    //   rangedAttacker(creep);
    // }
    if (creep.body.some(i => i.type === HEAL)) {
      creep.role = 'healer'
    }
    if (creep.role) {
      this.createThread(`creep_${creep.id}`, roles[creep.role], creep)
    }
  });
  const towers = getObjectsByPrototype(StructureTower).filter(t => t.my)
  for (const tower of towers) {
    this.createThread(`tower_${tower.id}`, runTower, tower)
  }
  while (true) {
    const enemyCreeps = getObjectsByPrototype(Creep).filter(i => !i.my)
    const towers = getObjectsByPrototype(StructureTower).filter(t => t.my)
    const [tower] = towers
    const targets = enemyCreeps
      .filter(t => t.exists)
      .sort((a, b) => getDistance(a, tower) - getDistance(b, tower));
    const [target] = targets
    for (const creep of myCreeps) {
      if (!creep.exists) continue
      if (!this.hasThread(`creep_${creep.id}`)) {
        if (target) {
          if (creep.body.some(b => b.type === RANGED_ATTACK)) {
            creep.moveTo(target)
            creep.rangedAttack(target)
            console.log(creep.rangedMassAttack(), JSON.stringify(RANGED_ATTACK_DISTANCE_RATE))
          }
          if (creep.body.some(b => b.type === ATTACK)) {
            creep.moveTo(target)
            creep.attack(target)
          }
        } else {
          creep.moveTo(enemyFlag)
        }
      }
    }
    yield
  }
}

function * runTower(tower) {
  const enemyCreeps = getObjectsByPrototype(Creep).filter(i => !i.my)
  while (true) {
    const targets = enemyCreeps
      .filter(t => t.exists)
      .filter(i => getDistance(i, tower) <= 5)
      .sort((a, b) => getDistance(a, tower) - getDistance(b, tower));
    const [target] = targets
    if (target) {
      tower.attack(target)
    }
    yield
  }
}


