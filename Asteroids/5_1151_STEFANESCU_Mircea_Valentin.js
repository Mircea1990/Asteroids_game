
const FPS = 30; // frames per second
const FrictionCoeficient = 0.8; // friction coefficient of space (0 = no friction, 1 = lots of friction)
const Lives = 3; // starting number of lives
const LaserTravel = 0.6; // max distance laser can travel as fraction of screen width
const ExplosionDuration = 0.1; // duration of the lasers' explosion in seconds
const MaxNrLaser = 8; // maximum number of lasers on screen at once
const LaserSpeed = 450; // speed of lasers in pixels per second
const AsteroidJagg = 0.5; // jaggedness of the asteroids (0 = none, 1 = lots)
const LargeAsteroidPoints = 20; // points scored for a large asteroid
const MediumAsteroidPoints = 50; // points scored for a medium asteroid
const SmallAsteroidPoints = 100; // points scored for a small asteroid
const AsteroidsNum = 3; // starting number of asteroids
const AsteroidSize = 100; // starting size of asteroids in pixels
const AsteroidSpeed = 50; // max starting speed of asteroids in pixels per second
const AsteroidVert = 10; // average number of vertices on each asteroid
const HighSoreSaveKey = "highscore"; // save key for local storage of high score
const ShipBlink = 0.1; // duration in seconds of a single blink during ship's invisibility
const ShipExplosion = 0.3; // duration of the ship's explosion in seconds
const ShipInvizibil = 3; // duration of the ship's invisibility in seconds
const ShipSize = 35; // ship height in pixels
const ShipThrust = 6; // acceleration of the ship in pixels per second per second
const ShipTurn = 360; // turn speed in degrees per second
const Bounding = false; // show or hide collision bounding
const CenterDot = false; // show or hide ship's centre dot
const SoundOn = true;
const TextFade = 2.5; // text fade time in seconds
const TextSize = 45; // text font height in pixels 

/** @type {HTMLCanvasElement} */
var canv = document.getElementById("gameCanvas");
var ctx = canv.getContext("2d");

// set up the game parameters
var level, lives, roids, score, scoreHigh, ship, text, textAlpha;
newGame();

// set up event handlers
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

// set up the game loop
setInterval(update, 1000 / FPS);

function createAsteroids()
{
    roids = [];
    roidsTotal = (AsteroidsNum + level) * 7;
    roidsLeft = roidsTotal;
    var x, y;
    for (var i = 0; i < AsteroidsNum + level; i++)
    {
        // random asteroid location (not touching spaceship)
        do
        {
            x = Math.floor(Math.random() * canv.width);
            y = Math.floor(Math.random() * canv.height);
        } while (distBetweenPoints(ship.x, ship.y, x, y) < AsteroidSize * 2 + ship.r);
        roids.push(newAsteroidField(x, y, Math.ceil(AsteroidSize / 2)));
    }
}

function destroyAsteroid(index)
{
    var x = roids[ index ].x;
    var y = roids[ index ].y;
    var r = roids[ index ].r;

    // split the asteroid in two if necessary
    if (r == Math.ceil(AsteroidSize / 2))
    { // large asteroid
        roids.push(newAsteroidField(x, y, Math.ceil(AsteroidSize / 4)));
        roids.push(newAsteroidField(x, y, Math.ceil(AsteroidSize / 4)));
        score += LargeAsteroidPoints;
    } else if (r == Math.ceil(AsteroidSize / 4))
    { // medium asteroid
        roids.push(newAsteroidField(x, y, Math.ceil(AsteroidSize / 8)));
        roids.push(newAsteroidField(x, y, Math.ceil(AsteroidSize / 8)));
        score += MediumAsteroidPoints;
    } else
    {
        score += SmallAsteroidPoints;
    }

    // check high score
    if (score > scoreHigh)
    {
        scoreHigh = score;
        localStorage.setItem(HighSoreSaveKey, scoreHigh);
    }

    // destroy the asteroid
    roids.splice(index, 1);
    fxHit.play();
    roidsLeft--;

    // new level when no more asteroids
    if (roids.length == 0)
    {
        level++;
        newGameLevel();
    }
}

function distBetweenPoints(x1, y1, x2, y2)
{
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function drawSpaceShip(x, y, a, colour = "white")
{
    ctx.strokeStyle = colour;
    ctx.lineWidth = ShipSize / 20;
    ctx.beginPath();
    ctx.moveTo( // nose of the ship
        x + 4 / 3 * ship.r * Math.cos(a),
        y - 4 / 3 * ship.r * Math.sin(a)
    );
    ctx.lineTo( // rear left
        x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
        y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
    );
    ctx.lineTo( // rear right
        x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
        y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
    );
    ctx.closePath();
    ctx.stroke();
}

function explodeSpaceShip()
{
    ship.explodeTime = Math.ceil(ShipExplosion * FPS);
    fxExplode.play();
}

function gameOver()
{
    ship.dead = true;
    text = "Game Over";
    textAlpha = 1.0;
}

function keyDown(/** @type {KeyboardEvent} */ ev)
{

    if (ship.dead)
    {
        return;
    }

    switch (ev.keyCode)
    {
        case 32: // space bar (shoot laser)
            rocketShoot();
            break;
        case 37: // left arrow (rotate ship left)
            ship.rot = ShipTurn / 180 * Math.PI / FPS;
            break;
        case 38: // up arrow (thrust the ship forward)
            ship.thrusting = true;
            break;
        case 39: // right arrow (rotate ship right)
            ship.rot = -ShipTurn / 180 * Math.PI / FPS;
            break;
    }
}

function keyUp(/** @type {KeyboardEvent} */ ev)
{

    if (ship.dead)
    {
        return;
    }

    switch (ev.keyCode)
    {
        case 32: // space bar (allow shooting again)
            ship.canShoot = true;
            break;
        case 37: // left arrow (stop rotating left)
            ship.rot = 0;
            break;
        case 38: // up arrow (stop thrusting)
            ship.thrusting = false;
            break;
        case 39: // right arrow (stop rotating right)
            ship.rot = 0;
            break;
    }
}

function newAsteroidField(x, y, r)
{
    var lvlMult = 1 + 0.1 * level;
    var roid = {
        x: x,
        y: y,
        xv: Math.random() * AsteroidSpeed * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
        yv: Math.random() * AsteroidSpeed * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
        a: Math.random() * Math.PI * 2, // in radians
        r: r,
        offs: [],
        vert: Math.floor(Math.random() * (AsteroidVert + 1) + AsteroidVert / 2)
    };

    // populate the offsets array
    for (var i = 0; i < roid.vert; i++)
    {
        roid.offs.push(Math.random() * AsteroidJagg * 2 + 1 - AsteroidJagg);
    }

    return roid;
}

function newGame()
{
    level = 0;
    lives = Lives;
    score = 0;
    ship = newShip();

    // get the high score from local storage
    var scoreStr = localStorage.getItem(HighSoreSaveKey);
    if (scoreStr == null)
    {
        scoreHigh = 0;
    } else
    {
        scoreHigh = parseInt(scoreStr);
    }

    newGameLevel();
}

function newGameLevel()
{
    text = "Level " + (level + 1);
    textAlpha = 1.0;
    createAsteroids();
}

function newShip()
{
    return {
        x: canv.width / 2,
        y: canv.height / 2,
        a: 90 / 180 * Math.PI, // convert to radians
        r: ShipSize / 2,
        blinkNum: Math.ceil(ShipInvizibil / ShipBlink),
        blinkTime: Math.ceil(ShipBlink * FPS),
        canShoot: true,
        dead: false,
        explodeTime: 0,
        lasers: [],
        rot: 0,
        thrusting: false,
        thrust: {
            x: 0,
            y: 0
        }
    }
}

function rocketShoot()
{
    // create the laser object
    if (ship.canShoot && ship.lasers.length < MaxNrLaser)
    {
        ship.lasers.push({ // from the nose of the ship
            x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
            y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
            xv: LaserSpeed * Math.cos(ship.a) / FPS,
            yv: -LaserSpeed * Math.sin(ship.a) / FPS,
            dist: 0,
            explodeTime: 0
        });
        fxLaser.play();
    }

    // prevent further shooting
    ship.canShoot = false;
}

function update()
{
    var blinkOn = ship.blinkNum % 2 == 0;
    var exploding = ship.explodeTime > 0;

    // draw space
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canv.width, canv.height);

    // draw the asteroids
    var a, r, x, y, offs, vert;
    for (var i = 0; i < roids.length; i++)
    {
        ctx.strokeStyle = "slategrey";
        ctx.lineWidth = ShipSize / 20;

        // get the asteroid properties
        a = roids[ i ].a;
        r = roids[ i ].r;
        x = roids[ i ].x;
        y = roids[ i ].y;
        offs = roids[ i ].offs;
        vert = roids[ i ].vert;

        // draw the path
        ctx.beginPath();
        ctx.moveTo(
            x + r * offs[ 0 ] * Math.cos(a),
            y + r * offs[ 0 ] * Math.sin(a)
        );

        // draw the polygon
        for (var j = 1; j < vert; j++)
        {
            ctx.lineTo(
                x + r * offs[ j ] * Math.cos(a + j * Math.PI * 2 / vert),
                y + r * offs[ j ] * Math.sin(a + j * Math.PI * 2 / vert)
            );
        }
        ctx.closePath();
        ctx.stroke();

        // show asteroid's collision circle
        if (Bounding)
        {
            ctx.strokeStyle = "lime";
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2, false);
            ctx.stroke();
        }
    }

    // thrust the ship
    if (ship.thrusting && !ship.dead)
    {
        ship.thrust.x += ShipThrust * Math.cos(ship.a) / FPS;
        ship.thrust.y -= ShipThrust * Math.sin(ship.a) / FPS;

    } else
    {
        // apply friction (slow the ship down when not thrusting)
        ship.thrust.x -= FrictionCoeficient * ship.thrust.x / FPS;
        ship.thrust.y -= FrictionCoeficient * ship.thrust.y / FPS;
    }

    // draw the triangular ship
    if (!exploding)
    {
        if (blinkOn && !ship.dead)
        {
            drawSpaceShip(ship.x, ship.y, ship.a);
        }

        // handle blinking
        if (ship.blinkNum > 0)
        {

            // reduce the blink time
            ship.blinkTime--;

            // reduce the blink num
            if (ship.blinkTime == 0)
            {
                ship.blinkTime = Math.ceil(ShipBlink * FPS);
                ship.blinkNum--;
            }
        }
    } else
    {
        // draw the explosion
        ctx.fillStyle = "darkred";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 0.8, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI * 2, false);
        ctx.fill();
    }

    // show ship's collision circle
    if (Bounding)
    {
        ctx.strokeStyle = "lime";
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false);
        ctx.stroke();
    }

    // show ship's centre dot
    if (CenterDot)
    {
        ctx.fillStyle = "red";
        ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
    }

    // draw the lasers
    for (var i = 0; i < ship.lasers.length; i++)
    {
        if (ship.lasers[ i ].explodeTime == 0)
        {
            ctx.fillStyle = "salmon";
            ctx.beginPath();
            ctx.arc(ship.lasers[ i ].x, ship.lasers[ i ].y, ShipSize / 15, 0, Math.PI * 2, false);
            ctx.fill();
        } else
        {
            // draw the explosion
            ctx.fillStyle = "orangered";
            ctx.beginPath();
            ctx.arc(ship.lasers[ i ].x, ship.lasers[ i ].y, ship.r * 0.75, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "salmon";
            ctx.beginPath();
            ctx.arc(ship.lasers[ i ].x, ship.lasers[ i ].y, ship.r * 0.5, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.fillStyle = "pink";
            ctx.beginPath();
            ctx.arc(ship.lasers[ i ].x, ship.lasers[ i ].y, ship.r * 0.25, 0, Math.PI * 2, false);
            ctx.fill();
        }
    }

    // draw the game text
    if (textAlpha >= 0)
    {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
        ctx.font = "small-caps " + TextSize + "px dejavu sans mono";
        ctx.fillText(text, canv.width / 2, canv.height * 0.75);
        textAlpha -= (1.0 / TextFade / FPS);
    } else if (ship.dead)
    {
        // after "game over" fades, start a new game
        newGame();
    }

    // draw the lives
    var lifeColour;
    for (var i = 0; i < lives; i++)
    {
        lifeColour = exploding && i == lives - 1 ? "red" : "white";
        drawSpaceShip(ShipSize + i * ShipSize * 1.5, ShipSize, 0.5 * Math.PI, lifeColour);
    }

    // draw the score
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.font = TextSize + "Arial";
    ctx.fillText(score, canv.width - ShipSize / 2, ShipSize);

    // draw the high score
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.font = (TextSize * 0.75) + "px dejavu sans mono";
    ctx.fillText("BEST " + scoreHigh, canv.width / 2, ShipSize);

    // detect laser hits on asteroids
    var ax, ay, ar, lx, ly;
    for (var i = roids.length - 1; i >= 0; i--)
    {

        // grab the asteroid properties
        ax = roids[ i ].x;
        ay = roids[ i ].y;
        ar = roids[ i ].r;

        // loop over the lasers
        for (var j = ship.lasers.length - 1; j >= 0; j--)
        {

            // grab the laser properties
            lx = ship.lasers[ j ].x;
            ly = ship.lasers[ j ].y;

            // detect hits
            if (ship.lasers[ j ].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) < ar)
            {

                // destroy the asteroid and activate the laser explosion
                destroyAsteroid(i);
                ship.lasers[ j ].explodeTime = Math.ceil(ExplosionDuration * FPS);
                break;
            }
        }
    }

    // check for asteroid collisions (when not exploding)
    if (!exploding)
    {

        // only check when not blinking
        if (ship.blinkNum == 0 && !ship.dead)
        {
            for (var i = 0; i < roids.length; i++)
            {
                if (distBetweenPoints(ship.x, ship.y, roids[ i ].x, roids[ i ].y) < ship.r + roids[ i ].r)
                {
                    explodeSpaceShip();
                    destroyAsteroid(i);
                    break;
                }
            }
        }

        // rotate the ship
        ship.a += ship.rot;

        // move the ship
        ship.x += ship.thrust.x;
        ship.y += ship.thrust.y;
    } else
    {
        // reduce the explode time
        ship.explodeTime--;

        // reset the ship after the explosion has finished
        if (ship.explodeTime == 0)
        {
            lives--;
            if (lives == 0)
            {
                gameOver();
            } else
            {
                ship = newShip();
            }
        }
    }

    // handle edge of screen
    if (ship.x < 0 - ship.r)
    {
        ship.x = canv.width + ship.r;
    } else if (ship.x > canv.width + ship.r)
    {
        ship.x = 0 - ship.r;
    }
    if (ship.y < 0 - ship.r)
    {
        ship.y = canv.height + ship.r;
    } else if (ship.y > canv.height + ship.r)
    {
        ship.y = 0 - ship.r;
    }

    // move the lasers
    for (var i = ship.lasers.length - 1; i >= 0; i--)
    {

        // check distance travelled
        if (ship.lasers[ i ].dist > LaserTravel * canv.width)
        {
            ship.lasers.splice(i, 1);
            continue;
        }

        // handle the explosion
        if (ship.lasers[ i ].explodeTime > 0)
        {
            ship.lasers[ i ].explodeTime--;

            // destroy the laser after the duration is up
            if (ship.lasers[ i ].explodeTime == 0)
            {
                ship.lasers.splice(i, 1);
                continue;
            }
        } else
        {
            // move the laser
            ship.lasers[ i ].x += ship.lasers[ i ].xv;
            ship.lasers[ i ].y += ship.lasers[ i ].yv;

            // calculate the distance travelled
            ship.lasers[ i ].dist += Math.sqrt(Math.pow(ship.lasers[ i ].xv, 2) + Math.pow(ship.lasers[ i ].yv, 2));
        }

        // handle edge of screen
        if (ship.lasers[ i ].x < 0)
        {
            ship.lasers[ i ].x = canv.width;
        } else if (ship.lasers[ i ].x > canv.width)
        {
            ship.lasers[ i ].x = 0;
        }
        if (ship.lasers[ i ].y < 0)
        {
            ship.lasers[ i ].y = canv.height;
        } else if (ship.lasers[ i ].y > canv.height)
        {
            ship.lasers[ i ].y = 0;
        }
    }

    // move the asteroids
    for (var i = 0; i < roids.length; i++)
    {
        roids[ i ].x += roids[ i ].xv;
        roids[ i ].y += roids[ i ].yv;

        // handle asteroid edge of screen
        if (roids[ i ].x < 0 - roids[ i ].r)
        {
            roids[ i ].x = canv.width + roids[ i ].r;
        } else if (roids[ i ].x > canv.width + roids[ i ].r)
        {
            roids[ i ].x = 0 - roids[ i ].r
        }
        if (roids[ i ].y < 0 - roids[ i ].r)
        {
            roids[ i ].y = canv.height + roids[ i ].r;
        } else if (roids[ i ].y > canv.height + roids[ i ].r)
        {
            roids[ i ].y = 0 - roids[ i ].r
        }
    }
}
