(function() {
  const timeouts = [];
  const messageName = 'zero-timeout-message';

  const setZeroTimeout = (fn) => {
    timeouts.push(fn);
    window.postMessage(messageName, '*');
  };

  const handleMessage = (event) => {
    if (event.source === window && event.data === messageName) {
      event.stopPropagation();

      if (timeouts.length > 0) {
        const fn = timeouts.shift();

        fn();
      }
    }
  };

  window.addEventListener('message', handleMessage, true);
  window.setZeroTimeout = setZeroTimeout;
})();

let Brain = new BirdBrain({
  population:50,
  network:[2, [2], 1],
});

let FPS = 60;
let images = {};

const speed = (fps) => {
  FPS = parseInt(fps);
};

const loadImages = (sources, callback) => {
  let nb = 0;
  let loaded = 0;
  let imgs = {};

  for(let i in sources){
    nb++;

    imgs[i] = new Image();
    imgs[i].src = sources[i];

    imgs[i].onload = () => {
      loaded++;
      if(loaded === nb){
        callback(imgs);
      }
    }
  }
};

class Bird {
  constructor(json) {
    this.x = 80;
    this.y = 250;
    this.width = 40;
    this.height = 30;

    this.alive = true;
    this.gravity = 0;
    this.velocity = 0.3;
    this.jump = -6;

    this.init(json);
  }

  init(json) {
    for(let i in json){
      this[i] = json[i];
    }
  }

  flap() {
    this.gravity = this.jump;
  }

  update() {
    this.gravity += this.velocity;
    this.y += this.gravity;
  }

  isDead(height, pipes) {
    if(this.y >= height || this.y + this.height <= 0){
      return true;
    }

    for(let i in pipes){
      if(!(
        this.x > pipes[i].x + pipes[i].width ||
        this.x + this.width < pipes[i].x ||
        this.y > pipes[i].y + pipes[i].height ||
        this.y + this.height < pipes[i].y
      )) {
        return true;
      }
    }
  }
}

class Pipe {
  constructor(json) {
    this.x = 0;
    this.y = 0;
    this.width = 50;
    this.height = 40;
    this.speed = 3;

    this.init(json);
  }

  init(json) {
    for(let i in json){
      this[i] = json[i];
    }
  }

  update() {
    this.x -= this.speed;
  }

  isOut() {
    if(this.x + this.width < 0){
      return true;
    }
  }
}

class Game {
  constructor() {
    this.pipes = [];
    this.birds = [];
    this.score = 0;
    this.maxScore = 0;
    this.pipesPassed = 0;
    this.maxPipesPassed = 0;
    this.canvas = document.querySelector("#flappy");
    this.ctx = this.canvas.getContext("2d");
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.spawnInterval = 90;
    this.interval = 0;
    this.gen = [];
    this.alives = 0;
    this.generation = 0;
    this.backgroundSpeed = 0.5;
    this.backgroundx = 0;
  }

  start() {
    this.interval = 0;
    this.score = 0;
    this.pipesPassed = 0;
    this.pipes = [];
    this.birds = [];

    this.gen = Brain.nextGeneration();

    for(let i in this.gen){
      let b = new Bird();
      this.birds.push(b)
    }

    this.generation++;
    this.alives = this.birds.length;
  }

  update() {
    this.backgroundx += this.backgroundSpeed;
    let nextHole = 0;

    if(this.birds.length > 0){
      for(let i = 0; i < this.pipes.length; i+=2){
        if(this.pipes[i].x + this.pipes[i].width > this.birds[0].x){
          nextHole = this.pipes[i].height/this.height;
          break;
        }
      }
    }

    for(let i in this.birds){
      if(this.birds[i].alive){
        const inputs = [
          this.birds[i].y / this.height,
          nextHole,
        ];

        const res = this.gen[i].compute(inputs);

        if(res > 0.5){
          this.birds[i].flap();
        }

        this.birds[i].update();

        if(this.birds[i].isDead(this.height, this.pipes)){
          this.birds[i].alive = false;
          this.alives--;

          Brain.networkScore(this.gen[i], this.score);

          if(this.isItEnd()){
            this.start();
          }
        }
      }
    }

    for(let i = 0; i < this.pipes.length; i++){
      this.pipes[i].update();

      if(this.pipes[i].isOut()){
        this.pipes.splice(i, 1);
        i--;
      }
    }

    if(this.interval === 0){
      const deltaBord = 50;
      const pipeHole = 120;
      const holePosition = Math.round(Math.random() * (this.height - deltaBord * 2 - pipeHole)) +  deltaBord;

      this.pipes.push(new Pipe({x:this.width, y:0, height:holePosition}));
      this.pipes.push(new Pipe({x:this.width, y:holePosition+pipeHole, height:this.height}));
    }

    this.interval++;

    if(this.interval === this.spawnInterval){
      this.pipesPassed++;
      this.maxPipesPassed = (this.pipesPassed > this.maxPipesPassed) ? this.pipesPassed : this.maxPipesPassed;

      this.interval = 0;
    }

    this.score++;
    this.maxScore = (this.score > this.maxScore) ? this.score : this.maxScore;

    if(FPS === 0){
      setZeroTimeout(() => {
        this.update();
      });
    }else{
      setTimeout(() => {
        this.update();
      }, 1000/FPS);
    }
  }

  isItEnd() {
    for(let i in this.birds){
      if(this.birds.hasOwnProperty(i) && this.birds[i].alive){
        return false;
      }
    }

    return true;
  }

  display() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for(let i = 0; i < Math.ceil(this.width / images.background.width) + 1; i++){
      this.ctx.drawImage(
        images.background,
        i * images.background.width - Math.floor(this.backgroundx%images.background.width),
        0,
      )
    }

    for(let i in this.pipes){
      if (this.pipes.hasOwnProperty(i)) {
        if (i % 2 === 0) {
          this.ctx.drawImage(
            images.pipeTop,
            this.pipes[i].x,
            this.pipes[i].y + this.pipes[i].height - images.pipeTop.height,
            this.pipes[i].width,
            images.pipeTop.height,
          );
        } else {
          this.ctx.drawImage(
            images.pipeBottom,
            this.pipes[i].x,
            this.pipes[i].y,
            this.pipes[i].width,
            images.pipeTop.height,
          );
        }
      }
    }

    this.ctx.fillStyle = '#FFC600';
    this.ctx.strokeStyle = '#CE9E00';

    for(let i in this.birds){
      if(this.birds.hasOwnProperty(i) && this.birds[i].alive){
        this.ctx.save();
        this.ctx.translate(this.birds[i].x + this.birds[i].width/2, this.birds[i].y + this.birds[i].height/2);
        this.ctx.rotate(Math.PI/2 * this.birds[i].gravity/20);
        this.ctx.drawImage(images.bird, -this.birds[i].width/2, -this.birds[i].height/2, this.birds[i].width, this.birds[i].height);
        this.ctx.restore();
      }
    }

    this.ctx.fillStyle = 'white';
    this.ctx.font = '24px Oswald, sans-serif';

    // Text on canvas section
    this.ctx.fillText(`Pipes: ${this.pipesPassed}`, 10, 65);
    this.ctx.fillText(`Record: ${this.maxPipesPassed}`, 10, 90);
    this.ctx.fillText(`Generation: ${this.generation}`, 218, 65);
    this.ctx.fillText(`Alive: ${this.alives} / ${Brain.options.population}`, 218, 90);

    requestAnimationFrame(() => {
      this.display();
    });
  }
}

const game = new Game();

window.onload = function(){
  const sprites = {
    bird: './img/bird.png',
    background: './img/background.png',
    pipeTop: './img/pipe-top.png',
    pipeBottom: './img/pipe-bottom.png'
  };

  const start = function(){
    game.start();
    game.update();
    game.display();
  };


  loadImages(sprites, (imgs) => {
    images = imgs;
    start();
  })
};

