// Game-specific variables

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
    .add("sprites/cookie.png")
    .add("sprites/empty-cookie.png")
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

// Game-specific variables
var autoSolveMode = true;
var autoSolveToggle;
var kingAttackers = [];

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
	loadingText = new PIXI.Text('Loading chess engine...', loadTextStyle);//


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

	// Check if Chess module is already loaded
	if (window.chessModuleLoaded) {
		if (useLocalFile) {
			activePuzzles = fens.split('\n');
			onPuzzlesLoaded();
		}
		else {
			// OLD
			// fetch initial puzzle set;
		}
	} else {
		// Wait for Chess module to load
		window.addEventListener('chessModuleLoaded', function() {
			if (useLocalFile) {
				activePuzzles = fens.split('\n');
				onPuzzlesLoaded();
			}
			else {
				// OLD
				// fetch initial puzzle set;
			}
		});
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

	// Make sure Chess is loaded before proceeding
	if (window.chessModuleLoaded) {
		loadSpecificPuzzle(puzzleIndex);
	} else {
		loadingText.text = "Loading chess engine...";
		window.addEventListener('chessModuleLoaded', function() {
			loadingText.text = "";
			loadSpecificPuzzle(puzzleIndex);
		});
	}

	if (gameIsTimed) {
		timerValue = startTime;
	}

	lastUpdateTime = Date.now();
	app.ticker.add(() => timeLoop());
}


function validateMateInOne(fen) {
	// Make sure Chess is defined
	if (typeof Chess === 'undefined') {
		console.error('Chess is not defined yet');
		return false;
	}
	
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


// Game-specific functions

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


function onPointerDownOnBoard(e) {
	if (!inputDisabled) {
		let pressedCoord = squareCoordFromPoint(e.data.getLocalPosition(boardContainer));

		if (selectedSprite != null && indexFromCoord(fromPoint) != indexFromCoord(pressedCoord)) {
			tryMakeMove(fromPoint, pressedCoord);
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

