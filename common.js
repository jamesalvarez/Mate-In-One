// Aliases://
var TextureCache = PIXI.utils.TextureCache;
var Point = PIXI.Point;
var nativeSize = 800;

// Confetti variables
var confettiContainer;
var confettiParticles = [];
var confettiColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFA500, 0x800080, 0x32CD32, 0x4169E1, 0xFFD700, 0xFF4500];
var confettiRunning = false;
var confettiDuration = 0;
var maxConfettiDuration = 5000; // 5 seconds minimum duration
var confettiWaves = 0;
var maxConfettiWaves = 3; // Number of waves of confetti

// Cookie bar variables
var cookieBarContainer;
var cookieSprites = [];
var maxCookies = 10;

// Appearance
var lightCol = 0xeed3ac;
var darkCol =  0xb38967;
var highlightCol_light = 0xede06f;
var highlightCol_dark = 0xceb244;
var checkmateHighlight_light = 0xed6a53;
var checkmateHighlight_dark = 0xd7543e;
var size = nativeSize/8;
var timeAlertCols = [0xffa79e,0xff6a5b,0xff3c28];
const numSolvedTextStyle = new PIXI.TextStyle({
    fill: "#ebebeb",
    fontFamily: "\"Lucida Console\", Monaco, monospace",
    fontSize: 30,
    fontWeight: "bold"
});
const timerTextStyle = new PIXI.TextStyle({
    fill: "#ebebeb",
    fontFamily: "\"Lucida Console\", Monaco, monospace",
    fontSize: 30,
    fontWeight: "bold"
});
const puzzleCounterTextStyle = new PIXI.TextStyle({
    fill: "#ebebeb",
    fontFamily: "\"Lucida Console\", Monaco, monospace",
    fontSize: 24,
    fontWeight: "bold"
});
const puzzleCounterInputStyle = new PIXI.TextStyle({
    fill: "#000000",
    fontFamily: "\"Lucida Console\", Monaco, monospace",
    fontSize: 24,
    fontWeight: "bold"
});
const nextButtonStyle = new PIXI.TextStyle({
    fill: "#FFFFFF",
    fontFamily: "\"Lucida Console\", Monaco, monospace",
    fontSize: 24,
    fontWeight: "bold"
});
const toggleButtonStyle = new PIXI.TextStyle({
    fill: "#FFFFFF",
    fontFamily: "\"Lucida Console\", Monaco, monospace",
    fontSize: 18,
    fontWeight: "bold"
});
const loadTextStyle = new PIXI.TextStyle({
    fill: "#000000",
    fontFamily: "\"Lucida Console\", Monaco, monospace",
    fontSize: 40,
    fontWeight: "bold",
	strokeThickness: 0
});
const instructionTextStyle = new PIXI.TextStyle({
    fill: "#ebebeb",
    fontFamily: "\"Lucida Console\", Monaco, monospace",
    fontSize: 24,
    fontWeight: "bold"
});

// Internal
var startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var pieceOrder = "KQBNRP";
var files = "abcdefgh";

// Common variables
var pieceTextures;
var selectedSprite;
var activePuzzles;
var preloadedPuzzles;
var puzzleIndex = 0;
var currentPuzzleNumber = 1;
var totalPuzzles = 0;
var fromPoint;
var allSprites = new Array(64);
var inputDisabled;
var holdingSprite;
var blackKingCoord;
var numSolved = 0;
var timerValue;
var timerPaused = false;
var lastUpdateTime;
var gameRunning = false;
var lastTimeWarningSecond = timeWarningStartTime;
var soundOn = false;
var puzzleCounterText;
var puzzleCounterInput;
var puzzleCounterContainer;
var nextButton;
var nextButtonVisible = false;
var cookieTexture;
var emptyCookieTexture;

// Sound variables
var puzzleCorrectSound;
var puzzleFailedSound;
var moveSound;
var timeOutSound;
var timeWarningSound;

// Common functions
function resize() {
	let inset = 20;//
	let scalePercent = 0.85; // Reduced from 0.9 to make board smaller

	let w = window.innerWidth-inset;
	let h = window.innerHeight-inset;

	app.renderer.resize(w,h);
	let minDim = Math.min(w,h);

	let scale = (minDim)/nativeSize * scalePercent;
	boardContainer.scale.set(scale);
	pieceContainer.scale.set(scale);
	let dstToTopEdge = (h-boardContainer.height)/2;
	// Move board down a bit more by adding a vertical offset
	let verticalOffset = 40;
	boardContainer.position.set((w-boardContainer.width)/2,(h-boardContainer.height)/2 - dstToTopEdge*.5 + verticalOffset);
	pieceContainer.position.set(boardContainer.position.x,boardContainer.position.y);

	// position text
	numSolvedText.scale.set(scale);
	timerText.scale.set(scale);
	loadingText.scale.set(scale);
	puzzleCounterContainer.scale.set(scale);
	cookieBarContainer.scale.set(scale * 0.8);

	setTextPositions();

	loadingText.position.set(boardContainer.position.x + boardContainer.width/2 - loadingText.width/2, boardContainer.position.y + boardContainer.height/2 - loadingText.height*1.25);//
}

function updatePuzzleCounterText() {
	puzzleCounterText.text = "Puzzle: " + currentPuzzleNumber + " / " + totalPuzzles;
	puzzleCounterInput.text = currentPuzzleNumber;
}

function clearHighlights() {
	for (let i = highlightContainer.children.length-1; i >=0; i --){
		highlightContainer.children[i].destroy();
	}
}

function highlightSquare(coord, lightHighlight, darkHighlight) {
	let graphics = new PIXI.Graphics();
	let col = ((coord.x +(7-coord.y)) %2==0)?lightHighlight:darkHighlight;
	graphics.beginFill(col);
	graphics.drawRect(coord.x*size, (7-coord.y)*size, size, size);
	highlightContainer.addChild(graphics);
}

function onDrag(e){
	if (selectedSprite != null && holdingSprite) {
		let p = e.data.getLocalPosition(boardContainer);
 		selectedSprite.position.set(p.x,p.y);
	}
}

function onRightClick(event) {
	event.preventDefault();
	if (selectedSprite != null) {
		let pos = posFromSquareCoord(fromPoint);
		selectedSprite.position.set(pos.x,pos.y);

    	selectedSprite = null;
		clearHighlights();
	}
}

function timeLoop() {
	var now = Date.now();
	var dt = now - lastUpdateTime;
	lastUpdateTime = now;

	// Update confetti animation
	if (confettiRunning) {
		updateConfetti(dt);
	}

	if (gameRunning) {
		if (gameIsTimed && !timerPaused) {
			timerValue -= dt*.001;
			timerValue = Math.max(0,timerValue);
			let formattedTimeVal = parseFloat(Math.round(timerValue * 100) / 100).toFixed(1);
			timerText.text = "Time: " + formattedTimeVal;

			if (Math.floor(timerValue) < lastTimeWarningSecond) {
				timerText.style.fill = timeAlertCols[timeWarningStartTime-Math.floor(timerValue)-1];
				lastTimeWarningSecond = Math.floor(timerValue);

				playSound(timeWarningSound);
			}

			if (timerValue === 0) {
				playSound(timeOutSound);
				gameOver();
			}

			setTextPositions();
		}
	}
}

function onPuzzleCorrect() {
	playSound(puzzleCorrectSound);

	timerText.style.fill = numSolvedTextStyle.fill;

	numSolved++;
	numSolvedText.text = 'solved: ' +numSolved;

    // Update cookie bar
    updateCookieBar();

	// Show next button instead of automatically loading next puzzle
	showNextButton();

	// Create confetti celebration
	createConfetti();

	if (resetTimerOnSolve) {
		timerPaused = true;
	}
}

function clearBoard() {
	pieceContainer.parent.removeChild(pieceContainer);
	pieceContainer = new PIXI.Container();

	// Make sure the piece container is added before the next button container
	// This ensures the next button stays on top
	let nextButtonContainer = nextButton.parent;
	app.stage.removeChild(nextButtonContainer);

	app.stage.addChild(pieceContainer);
	app.stage.addChild(nextButtonContainer);
	
	// Position the piece container at the same position as the board
	pieceContainer.position.set(boardContainer.position.x, boardContainer.position.y);
	pieceContainer.scale.set(boardContainer.scale.x);
}

function gameOver() {
	gameRunning = false;

	inputDisabled = true;
	clearHighlights();

	if (selectedSprite != null) {
		let pos = posFromSquareCoord(fromPoint);//
		selectedSprite.position.set(pos.x,pos.y);
		selectedSprite = null;
	}

	// Hide next button if it's visible
	if (nextButtonVisible) {
		hideNextButton();
	}

	timerText.style.fill = timeAlertCols[timeAlertCols.length-1];
	timerText.text = "click here to play again";
	timerText.interactive = true;
	timerText.on("pointerdown", restartgame);
	setTextPositions();
}

function restartgame() {
	lastTimeWarningSecond = timeWarningStartTime;

	timerText.interactive = false;
	timerText.off("pointerdown");
	timerText.text = "";
	timerText.style.fill = numSolvedTextStyle.fill;

	timerValue = startTime;
	inputDisabled = false;
	numSolved = 0;
	numSolvedText.text = "solved: " + numSolved;

    // Reset cookie bar
    updateCookieBar();

	// Reset to first puzzle
	puzzleIndex = 0;
	currentPuzzleNumber = 1;
	updatePuzzleCounterText();

	gameRunning = true;
	loadSpecificPuzzle(puzzleIndex);
}

function createNextButton() {
	let container = new PIXI.Container();

	// Create button background
	let background = new PIXI.Graphics();
	background.beginFill(0x3498db);
	background.drawRoundedRect(0, 0, 150, 50, 10);
	background.endFill();

	// Create button text
	let text = new PIXI.Text("Next", nextButtonStyle);
	text.anchor.set(0.5);
	text.position.set(background.width/2, background.height/2);

	container.addChild(background);
	container.addChild(text);

	// Make button interactive
	container.interactive = true;
	container.buttonMode = true;

	// Add hover effects
	container.on('pointerover', function() {
		background.clear();
		background.beginFill(0x2980b9);
		background.drawRoundedRect(0, 0, 150, 50, 10);
		background.endFill();
	});

	container.on('pointerout', function() {
		background.clear();
		background.beginFill(0x3498db);
		background.drawRoundedRect(0, 0, 150, 50, 10);
		background.endFill();
	});

	// Add click handler
	container.on('pointerdown', function() {
		hideNextButton();
		loadNextPuzzle();
	});

	return container;
}

function showNextButton() {
	nextButton.visible = true;
	nextButtonVisible = true;
	inputDisabled = true;
}

function hideNextButton() {
	nextButton.visible = false;
	nextButtonVisible = false;
	inputDisabled = false;
}

function createCookieBar() {
    // Clear existing cookies
    while (cookieBarContainer.children.length > 0) {
        cookieBarContainer.removeChild(cookieBarContainer.children[0]);
    }
    cookieSprites = [];

    // Create background for cookie bar
    let background = new PIXI.Graphics();
    background.beginFill(0x34495e, 0.7);
    background.drawRoundedRect(0, 0, 500, 60, 12);
    background.endFill();
    cookieBarContainer.addChild(background);

    // Add cookies (or empty cookie placeholders)
    const cookieSize = 42;
    const cookieMargin = 6;
    const startX = 15;
	const startY = 10;

    for (let i = 0; i < maxCookies; i++) {
        let cookieSprite;

        // Determine if this position should have a cookie or empty placeholder
        if (i < (numSolved % maxCookies)) {
            cookieSprite = new PIXI.Sprite(cookieTexture);
        } else {
            cookieSprite = new PIXI.Sprite(emptyCookieTexture);
        }

        cookieSprite.width = cookieSize;
        cookieSprite.height = cookieSize;
        cookieSprite.position.set(startX + i * (cookieSize + cookieMargin), startY + (40 - cookieSize) / 2);

        cookieBarContainer.addChild(cookieSprite);
        cookieSprites.push(cookieSprite);
    }
}

function updateCookieBar() {
    // Update cookies based on numSolved
    for (let i = 0; i < maxCookies; i++) {
        if (i < (numSolved % maxCookies)) {
            cookieSprites[i].texture = cookieTexture;
        } else {
            cookieSprites[i].texture = emptyCookieTexture;
        }
    }
}

function createConfetti() {
	// Clear any existing confetti
	while (confettiContainer.children.length > 0) {
		confettiContainer.removeChild(confettiContainer.children[0]);
	}
	confettiParticles = [];

	// Reset confetti timing
	confettiDuration = 0;
	confettiWaves = 0;

	// Create initial wave of confetti
	createConfettiWave();

	confettiRunning = true;
}

function createConfettiWave() {
	// Create multiple streams of confetti
	for (let stream = 0; stream < 50; stream++) {
		// Create a stream of confetti particles
		createConfettiStream(stream);
	}

	confettiWaves++;
}

function createConfettiStream(streamIndex) {
	// Each stream has a different starting position and timing
	const streamWidth = app.renderer.width;
	const streamX = (streamIndex / 50) * streamWidth;
	const streamDelay = streamIndex * 50; // Stagger the streams

	// Create particles for this stream
	for (let i = 0; i < 30; i++) {
		let particle = new PIXI.Graphics();
		let size = Math.random() * 12 + 5;
		let colorIndex = Math.floor(Math.random() * confettiColors.length);

		particle.beginFill(confettiColors[colorIndex]);

		// Random shapes for variety
		if (Math.random() < 0.3) {
			// Circle
			particle.drawCircle(0, 0, size / 2);
		} else if (Math.random() < 0.6) {
			// Square
			particle.drawRect(-size/2, -size/2, size, size);
		} else if (Math.random() < 0.8) {
			// Star
			drawStar(particle, 0, 0, 5, size/2, size/4);
		} else {
			// Heart
			drawHeart(particle, 0, 0, size/2);
		}

		particle.endFill();

		// Set initial position with variation around the stream position
		particle.x = streamX + Math.random() * 150 - 75;
		particle.y = -50 - Math.random() * 400 - streamDelay;

		// Set velocity with more variation (reduced speed even further)
		particle.vx = Math.random() * 2 - 1;
		particle.vy = Math.random() * 1 + 0.5; // Quarter of the original speed

		// Some particles spin fast, others slow
		if (Math.random() < 0.2) {
			// Fast spinning particles
			particle.va = Math.random() * 0.4 - 0.2; // 4x faster spin for some
		} else {
			// Normal spinning particles
			particle.va = Math.random() * 0.05 - 0.025; // Quarter of the original angular velocity
		}
		particle.rotation = Math.random() * Math.PI * 2;

		// Add some "flutter" effect
		particle.flutter = Math.random() * 0.3 + 0.1;
		particle.flutterSpeed = Math.random() * 0.2 + 0.1;
		particle.flutterOffset = Math.random() * Math.PI * 2;

		// Add lifetime for particles (quadrupled to compensate for slower fall)
		particle.lifetime = Math.random() * 12000 + 20000; // 20-32 seconds
		particle.age = 0;

		confettiContainer.addChild(particle);
		confettiParticles.push(particle);
	}
}

function drawHeart(graphics, x, y, size) {
	// Draw a heart shape
	graphics.moveTo(x, y + size * 0.3);
	graphics.bezierCurveTo(
		x, y,
		x - size, y,
		x - size, y + size
	);
	graphics.bezierCurveTo(
		x - size, y + size * 1.5,
		x, y + size * 1.5,
		x, y + size * 2
	);
	graphics.bezierCurveTo(
		x, y + size * 1.5,
		x + size, y + size * 1.5,
		x + size, y + size
	);
	graphics.bezierCurveTo(
		x + size, y,
		x, y,
		x, y + size * 0.3
	);
}

function drawStar(graphics, x, y, points, outerRadius, innerRadius) {
	let step = Math.PI / points;

	graphics.moveTo(x + outerRadius, y);

	for (let i = 0; i < points * 2; i++) {
		let radius = i % 2 === 0 ? innerRadius : outerRadius;
		let angle = i * step + Math.PI / 2;
		graphics.lineTo(
			x + radius * Math.cos(angle),
			y + radius * Math.sin(angle)
		);
	}
}

function updateConfetti(dt) {
	if (!confettiRunning) return;

	// Update total confetti duration
	confettiDuration += dt;

	// Create new waves of confetti periodically
	if (confettiWaves < maxConfettiWaves && confettiDuration > 1000 * confettiWaves) {
		createConfettiWave();
	}

	let particlesRemaining = false;

	// Update each particle
	for (let i = confettiParticles.length - 1; i >= 0; i--) {
		let particle = confettiParticles[i];

		// Update age
		particle.age += dt;

		// Remove particles that have exceeded their lifetime
		if (particle.age > particle.lifetime) {
			confettiContainer.removeChild(particle);
			confettiParticles.splice(i, 1);
			continue;
		}

		// Update position with flutter effect
		let flutterX = Math.sin(particle.age * particle.flutterSpeed + particle.flutterOffset) * particle.flutter;
		particle.x += particle.vx + flutterX;
		particle.y += particle.vy;
		particle.rotation += particle.va;

		// Add gravity and wind (reduced even further)
		particle.vy += 0.02; // Quarter of the original gravity
		particle.vx += Math.random() * 0.08 - 0.04; // Quarter of the original wind effect

		// Slow down horizontal movement over time
		particle.vx *= 0.99;

		// Add some randomness to movement
		if (Math.random() < 0.05) {
			particle.vx += Math.random() * 0.6 - 0.3;
		}

		// Check if particle is still active
		if (particle.y < app.renderer.height + 100) {
			particlesRemaining = true;
		}
	}

	// Stop animation if minimum duration has passed and no particles remain
	if (!particlesRemaining && confettiDuration > maxConfettiDuration) {
		confettiRunning = false;
		while (confettiContainer.children.length > 0) {
			confettiContainer.removeChild(confettiContainer.children[0]);
		}
		confettiParticles = [];
	}
}

function playSound(sound) {
	if (soundOn) {
		sound.play();
	}
}
