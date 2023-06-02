function preload() {

}

var pos, vel;
var d = 100;
function setup() {
    pos = createVector(d, d)
    vel = createVector(1, 1)
    createCanvas(windowWidth, windowHeight)
}

function draw() {
    if (random() > 0.9999) {
        clear()
    }
    circle(pos.x, pos.y, d)
    pos.x = pos.x+vel.x;
    pos.y = pos.y+vel.y;
    d = sin(pos.x * .02) * 100;
    console.log(`pos: ${pos}`)
    if (pos.x > windowWidth - d/2 || pos.x < d/2) {
        vel.x = vel.x * -1
    }
    if (pos.y > windowHeight  - d/2 || pos.y < d/2) {
        vel.y = vel.y * -1
    }
}