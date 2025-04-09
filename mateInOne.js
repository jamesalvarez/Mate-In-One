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

let app = new PIXI.Application({
	autoResize: true,
	width: nativeSize,
	height: nativeSize,
	antialias:true,
	transparent : true,
	resolution: 2
});

app.renderer.backgroundColor = 0x00000000;

//Add the canvas that Pixi automatically created for you to the HTML document
document.body.appendChild(app.view);

PIXI.loader
    .add("sprites/pieces.png")
    .add("sprites/cookie.png", "https://cdn-icons-png.flaticon.com/512/541/541732.png")
    .add("sprites/empty-cookie.png", "https://cdn-icons-png.flaticon.com/512/1046/1046874.png")
    .load(setup);

// Behaviour:
var useLocalFile = true;//
var blackPiecesInactive = true;
var resetTime = 750;
var blackMoveDelay = 350;
const timeWarningStartTime = 3;

// Game options:
var suddenDeath = false;
var gameIsTimed = false;
var resetTimerOnSolve = false;
var startTime = 180;//

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

// Internal
var startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
var pieceOrder = "KQBNRP";
var files = "abcdefgh";


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
var autoSolveMode = true;
var autoSolveToggle;
var kingAttackers = [];
var cookieTexture;
var emptyCookieTexture;

function setup() {
    // Load cookie textures
    cookieTexture = PIXI.loader.resources["sprites/cookie.png"].texture;
    emptyCookieTexture = PIXI.loader.resources["sprites/empty-cookie.png"].texture;

	// Get url params
	if (GetURLParameter('suddenDeath') == 'true') {
		suddenDeath = true;
	}
	if (GetURLParameter('timed') == 'true') {
		gameIsTimed = true;
	}
	if (GetURLParameter('resetTimerOnSolve') == 'true') {
		resetTimerOnSolve = true;
	}
	let startTimeParam = parseFloat(GetURLParameter('startTime'));
	if (!isNaN(startTimeParam)) {
		startTime = startTimeParam;
	}

	if (GetURLParameter('sound') == 'false') {
		soundOn = false;
	}

	//
	if (!gameIsTimed) {
		suddenDeath = false;
	}

	document.oncontextmenu = document.body.oncontextmenu = function(event) {onRightClick(event);};

    // Draw board
    boardContainer = new PIXI.Container();
	boardContainer.interactive = true;
	boardContainer.on('pointermove',onDrag);
	boardContainer.on('pointerdown',onPointerDownOnBoard);

	pieceContainer = new PIXI.Container();
	highlightContainer = new PIXI.Container();
	textContainer = new PIXI.Container();

	let graphics = new PIXI.Graphics();
    for	(let i = 0; i <8; i ++) {
        for	(let j = 0; j < 8; j ++){
            let col = ((i+j)%2===0)?lightCol:darkCol;
            graphics.beginFill(col);
            // draw a rectangle
            graphics.drawRect(i*size, j*size, size, size);
        }
    }

	// Create confetti container
	confettiContainer = new PIXI.Container();

    // Create cookie bar container
    cookieBarContainer = new PIXI.Container();
    createCookieBar();

	app.stage.addChild(boardContainer);
    boardContainer.addChild(graphics);
	boardContainer.addChild(highlightContainer);
	app.stage.addChild(pieceContainer);
	app.stage.addChild(textContainer);
	app.stage.addChild(confettiContainer);
    app.stage.addChild(cookieBarContainer);

    // Pieces in order: King, Queen, Bishop, Knight, Rook, Pawn [White,Black]
    pieceTextures = new Array(6);
    for (let i = 0; i < 6; i ++){
        pieceTextures[i] = new Array(2);
    }

    // Draw pieces
    let spriteSize = 1000/6.0;

    for (let i = 0; i <= 1; i ++) {
        for (let j = 0; j < 6; j++) {

            let rect = new PIXI.Rectangle(spriteSize*j,spriteSize*i,spriteSize,spriteSize);
            let texture = new PIXI.Texture(TextureCache["sprites/pieces.png"],rect);
            texture.frame = rect;
            pieceTextures[j][i] = texture;
        }
    }


	// text
	numSolvedText = new PIXI.Text('solved: 0', numSolvedTextStyle);
	loadingText = new PIXI.Text('fetching puzzles...', loadTextStyle);//


	timerText = new PIXI.Text('', timerTextStyle);
	if (gameIsTimed) {
		timerText.text = 'Time: 0.0';
	}
	textContainer.addChild(timerText);

	textContainer.addChild(numSolvedText);
	textContainer.addChild(loadingText);

	// Create puzzle counter and input
	puzzleCounterContainer = new PIXI.Container();
	puzzleCounterText = new PIXI.Text('Puzzle: 1 / ?', puzzleCounterTextStyle);

	// Create input box for puzzle number
	let inputBackground = new PIXI.Graphics();
	inputBackground.beginFill(0xFFFFFF);
	inputBackground.drawRect(0, 0, 80, 30);
	inputBackground.endFill();

	puzzleCounterInput = new PIXI.Text('1', puzzleCounterInputStyle);
	puzzleCounterInput.x = 5;
	puzzleCounterInput.y = 3;

	// Make input interactive
	inputBackground.interactive = true;
	inputBackground.buttonMode = true;

	inputBackground.on('pointerdown', function() {
		let newPuzzleNum = prompt("Enter puzzle number (1-" + totalPuzzles + "):", currentPuzzleNumber);
		if (newPuzzleNum !== null) {
			let num = parseInt(newPuzzleNum);
			if (!isNaN(num) && num >= 1 && num <= totalPuzzles) {
				currentPuzzleNumber = num;
				puzzleIndex = num - 1;
				puzzleCounterInput.text = num;
				loadSpecificPuzzle(puzzleIndex);
				updatePuzzleCounterText();
			}
		}
	});

	puzzleCounterContainer.addChild(inputBackground);
	puzzleCounterContainer.addChild(puzzleCounterInput);
	puzzleCounterContainer.addChild(puzzleCounterText);
	textContainer.addChild(puzzleCounterContainer);

	// Create Next button (initially hidden)
	nextButton = createNextButton();
	nextButton.visible = false;

	// Create a separate container for the next button to ensure it's on top
	let nextButtonContainer = new PIXI.Container();
	nextButtonContainer.addChild(nextButton);
	app.stage.addChild(nextButtonContainer);

	// Create Auto-Solve toggle button
	autoSolveToggle = createAutoSolveToggle();
	textContainer.addChild(autoSolveToggle);

	window.addEventListener('resize', resize);
	resize();

	if (useLocalFile) {
		activePuzzles = fens.split('\n');
		onPuzzlesLoaded();
	}
	else {
		// OLD
		// fetch initial puzzle set;
	}


	puzzleCorrectSound = new Audio('Resources/Audio/PuzzleCorrect.mp3');
	puzzleFailedSound = new Audio('Resources/Audio/PuzzleFailed.mp3');
	moveSound = new Audio('Resources/Audio/Move.mp3');
	timeOutSound = new Audio('Resources/Audio/TimeOut.mp3');
	timeWarningSound = new Audio('Resources/Audio/TimeWarning.mp3');

}

function onPuzzlesLoaded() {
	if (!useLocalFile) {
		preloadPuzzles();
	}//
	loadingText.text = "";

	// Set total puzzles count
	totalPuzzles = activePuzzles.length;
	updatePuzzleCounterText();

	gameRunning = true;

	loadSpecificPuzzle(puzzleIndex);

	if (gameIsTimed) {
		timerValue = startTime;
	}


	lastUpdateTime = Date.now();
	app.ticker.add(() => timeLoop());
}

function updatePuzzleCounterText() {
	puzzleCounterText.text = "Puzzle: " + currentPuzzleNumber + " / " + totalPuzzles;
	puzzleCounterInput.text = currentPuzzleNumber;
}

function validateMateInOne(fen) {
	let chess = new Chess(fen);
	if (validateFen(fen)) {
    	let moves = chess.moves();
		console.log(moves);
    	for (let i = 0; i < moves.length; i ++) {
    		if (moves[i].includes('#')){
    			return true;
    		}
    	}
	}
	return false;
}

function preloadPuzzles() {
    fetch(puzzlesUrl).then((response) => {
		response.text().then((response) => {
		    preloadedPuzzles = response.split('<br>');
		});
	});
}


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
	if (autoSolveToggle) {
		autoSolveToggle.scale.set(scale * 0.8);
	}
    cookieBarContainer.scale.set(scale * 0.8);

	setTextPositions();

	loadingText.position.set(boardContainer.position.x + boardContainer.width/2 - loadingText.width/2, boardContainer.position.y + boardContainer.height/2 - loadingText.height*1.25);//
}

function loadNextPuzzle() {
	if (activePuzzles != undefined && activePuzzles.length > 0) {
		// Move to next puzzle
		puzzleIndex = (puzzleIndex + 1) % activePuzzles.length;
		currentPuzzleNumber = puzzleIndex + 1;
		updatePuzzleCounterText();

		loadSpecificPuzzle(puzzleIndex);
	}
	else {
		console.log("No puzzles loaded")
	}
}

function loadSpecificPuzzle(index) {
	console.log('Loading puzzle ' + (index + 1) + ' of ' + totalPuzzles);
	if (activePuzzles != undefined && activePuzzles.length > 0 && index < activePuzzles.length) {
		let myFen = activePuzzles[index].split(',')[1];

		// double check that given position is mate in one, as there are currently some errors with puzzle generator where en-passant is involved.
		if (validateMateInOne(myFen)) {
			console.log('Puzzle loaded, autosolvemode: ' + autoSolveMode + ', gameRunning: ' + gameRunning);
			// If auto-solve mode is on, find and make the mate move immediately
			if (autoSolveMode && gameRunning) {
				chess = new Chess(myFen);
				autoSolvePuzzle();
				inputDisabled = false;
			} else {
				setBoardFromFen(myFen);
				chess = new Chess(myFen);

				if (gameRunning) {
					inputDisabled = false;
					if (resetTimerOnSolve) {
						timerValue = startTime;
					}
					timerPaused = false;
				}
			}
		}
		else {
			// Skip invalid puzzle
			loadNextPuzzle();
		}
	}
}

function autoSolvePuzzle() {
	console.log('Auto-solving puzzle...');
	if (!autoSolveMode) return;

	// Find the checkmate move
	let moves = chess.moves();
	let mateMove = null;

	for (let i = 0; i < moves.length; i++) {
		if (moves[i].includes('#')) {
			mateMove = moves[i];
			break;
		}
	}

	if (mateMove) {
		// Make the move without highlighting
		chess.move(mateMove);
		setBoardFromFen(chess.fen());

		// Get location of the black king
		let blackKingSquare = chess.findPiece({ type: 'k', color: 'b' });

		console.log('Black king square:', blackKingSquare);

		// Get the attackers of the black king
		kingAttackers = chess.attackers(blackKingSquare[0],'w');

		console.log('King attackers:', kingAttackers);

		// Clear any highlights
		clearHighlights();

	}
}



function setBoardFromFen(fen) {
	clearHighlights();
	clearBoard();

    let boardLayout = fen.split(' ')[0];
    let rankLayouts = boardLayout.split('/');

    for	(let rankIndex = 0; rankIndex < rankLayouts.length; rankIndex ++) {
        let fileIndex = 0;
        for (let j = 0; j < rankLayouts[rankIndex].length; j ++) {
            let char = rankLayouts[rankIndex][j];
            let num = parseFloat(char);
            if (!isNaN(num) && isFinite(num)) {
                fileIndex +=Number(parseFloat(char));
            }
            else {
                let colourIndex = (char.toUpperCase() == char)?0:1; // 0 = white, 1 = black
				let isWhite = colourIndex == 0;
                let pieceIndex = pieceOrder.indexOf(char.toUpperCase());
                let texture = pieceTextures[pieceIndex][colourIndex];
                let sprite = new PIXI.Sprite(texture);
				let pos = new Point(fileIndex*size+size*.5,rankIndex*size+size*.5);
				let coord = squareCoordFromPoint(pos);

                initPieceSprite(sprite, pos,size,isWhite);
                fileIndex+=1;

				if (char == 'k') {
					blackKingCoord = coord;
				}
			}

        }
    }
}

function initPieceSprite(sprite, point, size, isWhite){

    sprite.position.set(point.x, point.y);
    sprite.width = size;
    sprite.height = size;
    sprite.anchor.set(.5);

	if (isWhite || !blackPiecesInactive){
		sprite.interactive = true;
		sprite.buttonMode = true;

		sprite.on('pointerdown', () => onPieceSelected(sprite));
		sprite.on('pointerup', onPieceReleased);
	}
    pieceContainer.addChild(sprite);

	let squareIndex = indexFromCoord(squareCoordFromPoint(point));
	allSprites[squareIndex] = sprite;
}


function onPieceSelected(sprite) {
	if (inputDisabled){
		return;
	}

	fromPoint = squareCoordFromPoint(sprite.position);

	if (!autoSolveMode) {
		selectedSprite = sprite;
		holdingSprite = true;

		clearHighlights();
		highlightSquare(fromPoint, highlightCol_light, highlightCol_dark);

		//display piece on top of all other pieces
		pieceContainer.removeChild(sprite);
		pieceContainer.addChild(sprite);
	}

	// In auto-solve mode, check if the user clicked on a square with a piece attacking the king
	if (autoSolveMode && kingAttackers && kingAttackers.length > 0) {
		let clickedSquare = pointToAlgebraic(fromPoint);
		if (kingAttackers.includes(clickedSquare)) {
			onPuzzleCorrect();
		}
	}

}

function onPieceReleased() {
	if (selectedSprite == null || inputDisabled) {
		return;
	}

    let toPoint = squareCoordFromPoint(selectedSprite.position);
	tryMakeMove(fromPoint,toPoint);
}

function tryMakeMove(fromCoord, toCoord) {
	let proposedMove = pointToAlgebraic(fromCoord) +'-' + pointToAlgebraic(toCoord);

	let moveIsLegal = false;
	let legalMoves = chess.moves();
	let legalMove = null;

	for (let i = 0; i < legalMoves.length; i ++) {
		let legalMoveFomatted = legalMoves[i].from + '-' + legalMoves[i].to;
		if (legalMoveFomatted == proposedMove) {
			// if pawn promotion, then multiple moves will match proposed move coords
			// autopromote to knight if that is check
			moveIsLegal = true;
			legalMove = legalMoves[i];
			chess.move(legalMoves[i]);
			let moveIsCheck = chess.in_check();
			chess.undo();

			if (moveIsCheck) {
				break;
			}
		}
	}

	if (moveIsLegal) {
		chess.move(legalMove);
		lastTimeWarningSecond = timeWarningStartTime;
		let toIndex = indexFromCoord(toCoord);
		if (allSprites[toIndex] != null) {
			allSprites[toIndex].visible = false;
			allSprites[indexFromCoord(fromPoint)] = null;
			allSprites[toIndex] = selectedSprite;
		}
		setBoardFromFen(chess.fen());

		inputDisabled = true;
		// Puzzle solved: load next
		if (chess.in_checkmate()) {
			onPuzzleCorrect();
		}
		// Puzzle failed: show black response and then reload
		else {
			onPuzzleFailed();
		}

		highlightSquare(fromCoord, highlightCol_light, highlightCol_dark);
		highlightSquare(toCoord, highlightCol_light, highlightCol_dark);
	}
	else {
		let pos = posFromSquareCoord(fromCoord);
		selectedSprite.position.set(pos.x,pos.y);
	}

	if (indexFromCoord(toCoord) != indexFromCoord(fromCoord)) {
		if (!moveIsLegal) {
	    	clearHighlights();
		}
	}

	holdingSprite = false;
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

function makeLegalMoveAndReset() {
	clearHighlights();
	let moves = chess.moves();

	// choose move which captures piece of highest value (random if no captures available)
	if (moves.length > 0){
		let bestMove = moves[0];
		let bestScore = -1;
		let captureOrder = 'pnbrq';

		for (let i = 0; i < moves.length; i ++) {
			let moveScore = 0;
			if (moves[i].includes('#')) {
				bestMove = moves[i];
				break;
			}
			if (moves[i].captured != undefined) {
				moveScore = captureOrder.indexOf(moves[i].captured);
				if (moveScore > bestScore) {
					bestScore = moveScore;
					bestMove = moves[i];
				}
			}
		}

		chess.move(bestMove);
		playSound(moveSound);

		setBoardFromFen(chess.fen());
		highlightSquare(coordFromAlgebraic(bestMove.from), highlightCol_light, highlightCol_dark);
		highlightSquare(coordFromAlgebraic(bestMove.to), highlightCol_light, highlightCol_dark);
	}
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

function onPointerDownOnBoard(e) {
	if (!inputDisabled) {
		let pressedCoord = squareCoordFromPoint(e.data.getLocalPosition(boardContainer));

		if (selectedSprite != null && indexFromCoord(fromPoint) != indexFromCoord(pressedCoord)) {
			tryMakeMove(fromPoint, pressedCoord);
		}
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
	highlightSquare(blackKingCoord, checkmateHighlight_light, checkmateHighlight_dark);

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

function onPuzzleFailed() {
	playSound(puzzleFailedSound);

	setTimeout(function(){
		makeLegalMoveAndReset();
		if (!suddenDeath) {
			// Show next button instead of automatically loading next puzzle
			showNextButton();
		}
	}, blackMoveDelay);

	if (suddenDeath) {
		gameOver();
	}
	else {
		timerText.style.fill = numSolvedTextStyle.fill;
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

	resize();
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

function setTextPositions() {
	let boardEdgeBottom = boardContainer.position.y + boardContainer.height;
	let posY = boardEdgeBottom + numSolvedText.height * .5;
	let boardEdgeLeft = boardContainer.position.x;

	if (gameIsTimed) {
		timerText.position.set(boardEdgeLeft+boardContainer.width*.25-timerText.width/2, posY);
		numSolvedText.position.set(boardEdgeLeft+boardContainer.width*.85-numSolvedText.width/2, posY);

        // Position cookie bar to the left of numSolvedText with margin from board
        cookieBarContainer.position.set(
            boardEdgeLeft + boardContainer.width * 0.85 - numSolvedText.width/2 - cookieBarContainer.width - 20,
            boardEdgeBottom + 15
        );
	}
	else {
		numSolvedText.position.set(boardContainer.position.x + boardContainer.width*0.7 - numSolvedText.width/2, posY);

        // Position cookie bar to the left of numSolvedText with margin from board
        cookieBarContainer.position.set(
            boardContainer.position.x + boardContainer.width*0.7 - numSolvedText.width/2 - cookieBarContainer.width - 20,
            boardEdgeBottom + 15
        );
	}

	// Position puzzle counter above the board with more space
	puzzleCounterContainer.position.set(
		boardEdgeLeft + boardContainer.width/2 - puzzleCounterText.width/2,
		boardContainer.position.y - puzzleCounterText.height * 2
	);

	// Position the input box to the left of the counter text
	puzzleCounterInput.x = 5;
	puzzleCounterInput.y = 3;
	puzzleCounterText.x = 90; // Position text after input box
	puzzleCounterText.y = 3;

	// Position next button below the board, next to the solved text
	if (nextButton) {
		if (gameIsTimed) {
			// If game is timed, position next to the solved text on the right
			nextButton.position.set(
				boardEdgeLeft + boardContainer.width * 0.85 + numSolvedText.width/2 + 20,
				posY
			);
		} else {
			// If game is not timed, position next to the solved text
			nextButton.position.set(
				boardContainer.position.x + boardContainer.width*0.7 + numSolvedText.width/2 + 20,
				posY
			);
		}
		// Make sure the button is scaled properly
		nextButton.scale.set(boardContainer.scale.x * 0.8);
	}

	// Position auto-solve toggle in the top-right corner of the board
	if (autoSolveToggle) {
		autoSolveToggle.position.set(
			boardEdgeLeft + boardContainer.width - autoSolveToggle.width - 10,
			boardContainer.position.y - autoSolveToggle.height - 10
		);
		autoSolveToggle.scale.set(boardContainer.scale.x * 0.8);
	}
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

function createAutoSolveToggle() {
	let container = new PIXI.Container();

	// Create button background
	let background = new PIXI.Graphics();
	background.beginFill(autoSolveMode ? 0x1abc9c : 0x34495e);
	background.drawRoundedRect(0, 0, 200, 40, 8);
	background.endFill();

	// Create button text
	let text = new PIXI.Text("Auto-Solve: ON", toggleButtonStyle);
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
		background.beginFill(autoSolveMode ? 0x16a085 : 0x2c3e50);
		background.drawRoundedRect(0, 0, 200, 40, 8);
		background.endFill();
	});

	container.on('pointerout', function() {
		background.clear();
		background.beginFill(autoSolveMode ? 0x1abc9c : 0x34495e);
		background.drawRoundedRect(0, 0, 200, 40, 8);
		background.endFill();
	});

	// Add click handler
	container.on('pointerdown', function() {
		autoSolveMode = !autoSolveMode;

		// Update button appearance
		background.clear();
		background.beginFill(autoSolveMode ? 0x1abc9c : 0x34495e);
		background.drawRoundedRect(0, 0, 200, 40, 8);
		background.endFill();

		// Update text
		text.text = "Auto-Solve: " + (autoSolveMode ? "ON" : "OFF");

		// If turning on auto-solve and a puzzle is currently displayed, solve it
		if (autoSolveMode && gameRunning && !inputDisabled) {
			autoSolvePuzzle();
		}
	});

	return container;
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
