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
var blackPiecesInactive = false; // Allow black pieces to be moved
var resetTime = 750;
var blackMoveDelay = 350;
const timeWarningStartTime = 3;

// Game options:
var suddenDeath = false;
var gameIsTimed = false;
var resetTimerOnSolve = false;
var startTime = 180;//

// Game-specific variables
var currentPuzzleMoves = [];
var instructionText;
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

	// Create instruction text
	instructionText = new PIXI.Text('Find the hanging piece!', instructionTextStyle);
	textContainer.addChild(instructionText);

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

	window.addEventListener('resize', resize);
	resize();

	// Check if Chess module is already loaded
	if (window.chessModuleLoaded) {
		activePuzzles = fens.split('\n');
		onPuzzlesLoaded();
	} else {
		// Wait for Chess module to load
		window.addEventListener('chessModuleLoaded', function() {
			activePuzzles = fens.split('\n');
			onPuzzlesLoaded();
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
		let puzzleData = activePuzzles[index].split(',');
		let myFen = puzzleData[1];

		// Get the moves for this puzzle
		currentPuzzleMoves = puzzleData[2].split(' ');
		console.log("Moves: " + currentPuzzleMoves);

		// Set up the board with the initial position
		setBoardFromFen(myFen);
		chess = new Chess(myFen);

		if (gameRunning) {
			// Initially disable input while first move is played
			inputDisabled = true;

			if (resetTimerOnSolve) {
				timerValue = startTime;
			}
			timerPaused = false;

			// Play the first move after a short delay
			setTimeout(function() {
				playFirstMove();
			}, 500);
		}
	}
}

function playFirstMove() {
	if (currentPuzzleMoves && currentPuzzleMoves.length >= 1) {
		// Get the first move
		let firstMove = currentPuzzleMoves[0];
		let from = firstMove.substring(0, 2);
		let to = firstMove.substring(2, 4);

		// Make the move on the chess board
		let moveObj = {
			from: from,
			to: to
		};

		// Check if the move is legal
		let legalMoves = chess.moves({ verbose: true });
		let moveIsLegal = false;

		for (let i = 0; i < legalMoves.length; i++) {
			if (legalMoves[i].from === from && legalMoves[i].to === to) {
				moveIsLegal = true;
				chess.move(legalMoves[i]);
				break;
			}
		}

		if (moveIsLegal) {
			// Update the board display
			setBoardFromFen(chess.fen());

			// Highlight the move
			highlightSquare(coordFromAlgebraic(from), highlightCol_light, highlightCol_dark);
			highlightSquare(coordFromAlgebraic(to), highlightCol_light, highlightCol_dark);

			// Play move sound
			playSound(moveSound);

			// Enable input after the first move is played
			setTimeout(function() {
				inputDisabled = false;
			}, 500);
		} else {
			console.error("First move is not legal:", firstMove);
			inputDisabled = false;
		}
	} else {
		console.error("No moves defined for this puzzle");
		inputDisabled = false;
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

                initPieceSprite(sprite, pos, size, isWhite);
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

	// All pieces are interactive in this version
	sprite.interactive = true;
	sprite.buttonMode = true;
	sprite.isWhite = isWhite;

	sprite.on('pointerdown', () => onPieceSelected(sprite));
	sprite.on('pointerup', onPieceReleased);

    pieceContainer.addChild(sprite);

	let squareIndex = indexFromCoord(squareCoordFromPoint(point));
	allSprites[squareIndex] = sprite;
}

function onPieceSelected(sprite) {
	if (inputDisabled){
		return;
	}

	fromPoint = squareCoordFromPoint(sprite.position);
	selectedSprite = sprite;
	holdingSprite = true;

	clearHighlights();
	highlightSquare(fromPoint, highlightCol_light, highlightCol_dark);

	//display piece on top of all other pieces
	pieceContainer.removeChild(sprite);
	pieceContainer.addChild(sprite);
}

function onPieceReleased() {
	if (selectedSprite == null || inputDisabled) {
		return;
	}

    let toPoint = squareCoordFromPoint(selectedSprite.position);
	tryMakeMove(fromPoint, toPoint);
}

function tryMakeMove(fromCoord, toCoord) {
	let fromAlgebraic = pointToAlgebraic(fromCoord);
	let toAlgebraic = pointToAlgebraic(toCoord);
	let proposedMove = fromAlgebraic + toAlgebraic; // Remove the hyphen to match our move format

	// Check if this is a capture move or any legal move
	let toIndex = indexFromCoord(toCoord);
	let targetPiece = allSprites[toIndex];
	let moveIsLegal = false;
	let legalMoves = chess.moves({ verbose: true });

	for (let i = 0; i < legalMoves.length; i++) {
		if (legalMoves[i].from === fromAlgebraic && legalMoves[i].to === toAlgebraic) {
			moveIsLegal = true;
			chess.move(legalMoves[i]);
			break;
		}
	}

	if (moveIsLegal) {
		// Move was successful
		playSound(moveSound);

		// If there was a piece at the target square, remove it (capture)
		if (targetPiece) {
			targetPiece.visible = false;
			allSprites[toIndex] = null;
		}

		// Move the piece
		let pos = posFromSquareCoord(toCoord);
		selectedSprite.position.set(pos.x, pos.y);
		allSprites[indexFromCoord(fromCoord)] = null;
		allSprites[toIndex] = selectedSprite;

		// Highlight the move
		highlightSquare(fromCoord, highlightCol_light, highlightCol_dark);
		highlightSquare(toCoord, checkmateHighlight_light, checkmateHighlight_dark);

		// Check if this is the correct move (second move in the puzzle)
		if (currentPuzzleMoves && currentPuzzleMoves.length >= 2) {
			let correctMove = currentPuzzleMoves[1];
			if (proposedMove === correctMove) {
				// Puzzle solved correctly
				onPuzzleCorrect();
			} else {
				// Wrong move, but still legal
				// We'll allow it but not count it as correct
				clearHighlights();
				highlightSquare(fromCoord, highlightCol_light, highlightCol_dark);
				highlightSquare(toCoord, highlightCol_light, highlightCol_dark);
				
				// Reset the puzzle after a delay
				setTimeout(function() {
					loadSpecificPuzzle(puzzleIndex);
				}, 1500);
			}
		} else {
			// No correct move defined, just accept any legal move
			onPuzzleCorrect();
		}
	} else {
		// Invalid move, return piece to original position
		let pos = posFromSquareCoord(fromCoord);
		selectedSprite.position.set(pos.x, pos.y);
		clearHighlights();
	}

	holdingSprite = false;
}


function onPointerDownOnBoard(e) {
	if (!inputDisabled) {
		let pressedCoord = squareCoordFromPoint(e.data.getLocalPosition(boardContainer));

		if (selectedSprite != null && indexFromCoord(fromPoint) != indexFromCoord(pressedCoord)) {
			tryMakeMove(fromPoint, pressedCoord);
		}
	}
}





function setTextPositions() {
	let boardEdgeBottom = boardContainer.position.y + boardContainer.height;
	let posY = boardEdgeBottom + numSolvedText.height * .5;
	let boardEdgeLeft = boardContainer.position.x;

	// Position instruction text above the board
	instructionText.position.set(
		boardEdgeLeft + boardContainer.width/2 - instructionText.width/2,
		boardContainer.position.y - instructionText.height * 3.5
	);

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
}



