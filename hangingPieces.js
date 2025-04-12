// Game-specific variables
var currentPuzzleMoves = [];

// Initialize the app
initApp();

// Game-specific setup function
function gameSpecificSetup() {

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




