// Game-specific variables
var kingAttackers = [];

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

function loadSpecificPuzzle(index) {
	console.log('Loading puzzle ' + (index + 1) + ' of ' + totalPuzzles);
	if (activePuzzles != undefined && activePuzzles.length > 0 && index < activePuzzles.length) {
		let myFen = activePuzzles[index].split(',')[1];

		// double check that given position is mate in one, as there are currently some errors with puzzle generator where en-passant is involved.
		if (validateMateInOne(myFen) & gameRunning) {
			chess = new Chess(myFen);
			autoSolvePuzzle();
			inputDisabled = false;
		}
		else {
			loadNextPuzzle(); // Skip invalid puzzle
		}
	}
}

function autoSolvePuzzle() {
	console.log('Auto-solving puzzle...');

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


function onPieceSelected(sprite) {
	if (inputDisabled){
		return;
	}

	fromPoint = squareCoordFromPoint(sprite.position);

	// In auto-solve mode, check if the user clicked on a square with a piece attacking the king
	if (kingAttackers && kingAttackers.length > 0) {
		let clickedSquare = pointToAlgebraic(fromPoint);
		if (kingAttackers.includes(clickedSquare)) {
			onPuzzleCorrect();
		}
	} else {
		onPuzzleCorrect(); // Failsafe in case puzzle didn't have any king attackers
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




