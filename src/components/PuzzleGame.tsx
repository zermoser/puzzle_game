import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Lightbulb, Settings, Volume2, VolumeX, Timer, Target } from 'lucide-react';

const PuzzleGame: React.FC = () => {
    // Simplified state management
    const [tiles, setTiles] = useState<number[]>([]);
    const [isWon, setIsWon] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [moveCount, setMoveCount] = useState<number>(0);
    const [timer, setTimer] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [bestTime, setBestTime] = useState<number>(0);
    const [bestMoves, setBestMoves] = useState<number>(0);
    const [difficulty, setDifficulty] = useState<3 | 4 | 5>(3);
    const [theme, setTheme] = useState<'minimal-light' | 'minimal-dark' | 'soft-blue' | 'warm-sand'>('minimal-light');
    const [animatingTiles, setAnimatingTiles] = useState<Set<number>>(new Set());
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [hintsRemaining, setHintsRemaining] = useState<number>(3);
    const [showSettings, setShowSettings] = useState<boolean>(false);

    const gameContainerRef = useRef<HTMLDivElement>(null);
    const moveSoundRef = useRef<HTMLAudioElement | null>(null);
    const winSoundRef = useRef<HTMLAudioElement | null>(null);
    const clickSoundRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        if (typeof Audio !== 'undefined') {
            moveSoundRef.current = new Audio('/sounds/move.wav');
            winSoundRef.current = new Audio('/sounds/win.wav');
            clickSoundRef.current = new Audio('/sounds/click.wav');
        }
    }, []);

    // Play sound if enabled
    const playSound = (sound: 'move' | 'win' | 'click') => {
        if (!soundEnabled) return;

        try {
            switch (sound) {
                case 'move':
                    moveSoundRef.current?.play();
                    break;
                case 'win':
                    winSoundRef.current?.play();
                    break;
                case 'click':
                    clickSoundRef.current?.play();
                    break;
            }
        } catch (e) {
            console.error("Error playing sound:", e);
        }
    };

    // Advanced shuffle with guaranteed solvability
    const shuffleTiles = useCallback((): number[] => {
        const totalTiles = difficulty * difficulty;
        const newTiles = Array.from({ length: totalTiles }, (_, i) => i);

        // Perform valid moves to ensure solvability
        const emptyPos = totalTiles - 1;
        let currentEmpty = emptyPos;

        for (let i = 0; i < 1000; i++) {
            const validMoves = getValidMoves(currentEmpty);
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            [newTiles[currentEmpty], newTiles[randomMove]] = [newTiles[randomMove], newTiles[currentEmpty]];
            currentEmpty = randomMove;
        }

        return newTiles;
    }, [difficulty]);

    // Get valid moves for a position
    const getValidMoves = useCallback((emptyIndex: number): number[] => {
        const row = Math.floor(emptyIndex / difficulty);
        const col = emptyIndex % difficulty;
        const moves: number[] = [];

        if (row > 0) moves.push(emptyIndex - difficulty);
        if (row < difficulty - 1) moves.push(emptyIndex + difficulty);
        if (col > 0) moves.push(emptyIndex - 1);
        if (col < difficulty - 1) moves.push(emptyIndex + 1);

        return moves;
    }, [difficulty]);

    // Win detection
    const checkWin = useCallback((currentTiles: number[]): boolean => {
        const totalTiles = difficulty * difficulty;
        const winningPattern = Array.from({ length: totalTiles - 1 }, (_, i) => i + 1);
        winningPattern.push(0);

        return currentTiles.every((tile, index) => tile === winningPattern[index]);
    }, [difficulty]);

    // Timer effect
    useEffect(() => {
        let interval: number;
        if (isPlaying && !isWon && !isPaused) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, isWon, isPaused]);

    // Initialize game
    useEffect(() => {
        resetGame();
    }, [difficulty, shuffleTiles]);

    // Win detection
    useEffect(() => {
        if (tiles.length > 0 && checkWin(tiles)) {
            setIsWon(true);
            setIsPlaying(false);

            // Update best scores
            if (bestTime === 0 || timer < bestTime) setBestTime(timer);
            if (bestMoves === 0 || moveCount < bestMoves) setBestMoves(moveCount);

            // Celebration animation
            setTimeout(() => {
                setAnimatingTiles(new Set(Array.from({ length: difficulty * difficulty }, (_, i) => i)));
                setTimeout(() => setAnimatingTiles(new Set()), 1000);
            }, 300);

            // Play win sound
            playSound('win');
        }
    }, [tiles, timer, moveCount, bestTime, bestMoves, checkWin, difficulty]);

    // Tile movement handler
    const handleTileClick = (index: number): void => {
        if (isWon || isPaused || animatingTiles.has(index)) return;

        const emptyIndex = tiles.indexOf(0);
        const validMoves = getValidMoves(emptyIndex);

        if (validMoves.includes(index)) {
            // Play move sound
            playSound('move');

            // Animate tile movement
            setAnimatingTiles(prev => new Set([...prev, index]));

            setTimeout(() => {
                const newTiles = [...tiles];
                [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];

                setTiles(newTiles);
                setMoveCount(prev => prev + 1);

                setAnimatingTiles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                });
            }, 150);
        } else {
            // Play error sound
            playSound('click');

            // Wrong move animation
            setAnimatingTiles(prev => new Set([...prev, index]));
            setTimeout(() => {
                setAnimatingTiles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                });
            }, 300);
        }
    };

    // Hint functionality
    const showHintMove = (): void => {
        if (hintsRemaining <= 0) return;

        const emptyIndex = tiles.indexOf(0);
        const validMoves = getValidMoves(emptyIndex);

        if (validMoves.length > 0) {
            // Play click sound
            playSound('click');

            // Simple heuristic: find move that improves overall position
            let bestMove = validMoves[0];
            let bestScore = -Infinity;

            validMoves.forEach(move => {
                const tempTiles = [...tiles];
                [tempTiles[move], tempTiles[emptyIndex]] = [tempTiles[emptyIndex], tempTiles[move]];
                const score = calculatePositionScore(tempTiles);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            });

            setAnimatingTiles(prev => new Set([...prev, bestMove]));
            setHintsRemaining(prev => prev - 1);

            setTimeout(() => {
                setAnimatingTiles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(bestMove);
                    return newSet;
                });
            }, 1500);
        }
    };

    // Calculate position score for AI
    const calculatePositionScore = (currentTiles: number[]): number => {
        let score = 0;
        currentTiles.forEach((tile, index) => {
            if (tile !== 0) {
                const targetRow = Math.floor((tile - 1) / difficulty);
                const targetCol = (tile - 1) % difficulty;
                const currentRow = Math.floor(index / difficulty);
                const currentCol = index % difficulty;

                const distance = Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
                score -= distance;
            }
        });
        return score;
    };

    // Reset game
    const resetGame = (): void => {
        const newTiles = shuffleTiles();
        setTiles(newTiles);
        setIsWon(false);
        setIsPaused(false);
        setIsPlaying(true);
        setTimer(0);
        setMoveCount(0);
        setHintsRemaining(3);
        setAnimatingTiles(new Set());
    };

    // Format time
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Get theme classes
    const getThemeClasses = () => {
        switch (theme) {
            case 'minimal-light':
                return {
                    bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
                    card: 'bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm',
                    tile: 'bg-white border border-gray-300 text-gray-800 shadow-sm',
                    empty: 'bg-gray-100 border border-dashed border-gray-300',
                    accent: 'text-blue-600',
                    button: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
                    modal: 'bg-white/90 backdrop-blur-sm border border-gray-200',
                    text: 'text-gray-800',
                    textLight: 'text-gray-600'
                };
            case 'minimal-dark':
                return {
                    bg: 'bg-gradient-to-br from-gray-900 to-gray-800',
                    card: 'bg-gray-800/90 backdrop-blur-sm border border-gray-700 shadow-sm',
                    tile: 'bg-gray-700 border border-gray-600 text-gray-100 shadow-sm',
                    empty: 'bg-gray-800 border border-dashed border-gray-600',
                    accent: 'text-blue-400',
                    button: 'bg-gray-700 border border-gray-600 text-gray-100 hover:bg-gray-600',
                    modal: 'bg-gray-800/90 backdrop-blur-sm border border-gray-700',
                    text: 'text-gray-100',
                    textLight: 'text-gray-400'
                };
            case 'soft-blue':
                return {
                    bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
                    card: 'bg-white/90 backdrop-blur-sm border border-blue-200 shadow-sm',
                    tile: 'bg-white border border-blue-200 text-blue-900 shadow-sm',
                    empty: 'bg-blue-50 border border-dashed border-blue-200',
                    accent: 'text-blue-600',
                    button: 'bg-white border border-blue-200 text-blue-800 hover:bg-blue-50',
                    modal: 'bg-white/90 backdrop-blur-sm border border-blue-200',
                    text: 'text-blue-900',
                    textLight: 'text-blue-700'
                };
            case 'warm-sand':
                return {
                    bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
                    card: 'bg-white/90 backdrop-blur-sm border border-amber-200 shadow-sm',
                    tile: 'bg-white border border-amber-200 text-amber-900 shadow-sm',
                    empty: 'bg-amber-50 border border-dashed border-amber-200',
                    accent: 'text-amber-600',
                    button: 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50',
                    modal: 'bg-white/90 backdrop-blur-sm border border-amber-200',
                    text: 'text-amber-900',
                    textLight: 'text-amber-700'
                };
            default:
                return getThemeClasses();
        }
    };

    const themeClasses = getThemeClasses();

    return (
        <div
            className={`min-h-screen ${themeClasses.bg} flex flex-col items-center justify-center p-4 relative transition-colors duration-300`}
            ref={gameContainerRef}
        >
            {/* Header */}
            <div className="text-center mb-6">
                <h1 className={`text-3xl font-bold mb-2 ${themeClasses.text}`}>
                    Sliding Puzzle
                </h1>
                <p className={`${themeClasses.textLight} font-medium`}>
                    Arrange the tiles in order
                </p>
            </div>

            {/* Game Stats */}
            <div className="flex justify-center gap-6 mb-6 w-full max-w-md">
                <div className={`${themeClasses.card} rounded-xl p-3 text-center flex items-center gap-2`}>
                    <Timer className={`w-5 h-5 ${themeClasses.textLight}`} />
                    <div>
                        <div className={`text-lg font-bold ${themeClasses.text}`}>{formatTime(timer)}</div>
                        <p className={`text-xs ${themeClasses.textLight}`}>Time</p>
                    </div>
                </div>

                <div className={`${themeClasses.card} rounded-xl p-3 text-center flex items-center gap-2`}>
                    <Target className={`w-5 h-5 ${themeClasses.textLight}`} />
                    <div>
                        <div className={`text-lg font-bold ${themeClasses.text}`}>{moveCount}</div>
                        <p className={`text-xs ${themeClasses.textLight}`}>Moves</p>
                    </div>
                </div>
            </div>

            {/* Puzzle Grid */}
            <div className={`${themeClasses.card} rounded-2xl p-4 mb-6`}>
                <div
                    className={`grid gap-2 w-full max-w-md mx-auto`}
                    style={{ gridTemplateColumns: `repeat(${difficulty}, 1fr)` }}
                >
                    {tiles.map((tile, index) => {
                        const isEmpty = tile === 0;
                        const isAnimating = animatingTiles.has(index);

                        return (
                            <button
                                key={index}
                                onClick={() => handleTileClick(index)}
                                disabled={isWon || isPaused}
                                className={`
                  aspect-square text-xl font-bold rounded-lg transition-all duration-200
                  ${isEmpty
                                        ? `${themeClasses.empty} cursor-default`
                                        : `${themeClasses.tile} hover:shadow-md cursor-pointer`
                                    }
                  ${isAnimating ? 'scale-95' : ''}
                  ${difficulty === 3 ? 'text-2xl' : difficulty === 4 ? 'text-xl' : 'text-lg'}
                `}
                                style={{
                                    width: `${300 / difficulty}px`,
                                    height: `${300 / difficulty}px`,
                                }}
                            >
                                {tile !== 0 && (
                                    <span className={`${isAnimating ? 'animate-pulse' : ''}`}>
                                        {tile}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Game Controls */}
            <div className="flex flex-wrap gap-3 mb-6 justify-center">
                <button
                    onClick={resetGame}
                    className={`px-5 py-2 rounded-lg ${themeClasses.button} font-medium flex items-center gap-2`}
                >
                    <RotateCcw className="w-4 h-4" />
                    New Game
                </button>

                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`px-5 py-2 rounded-lg ${themeClasses.button} font-medium flex items-center gap-2`}
                >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                </button>

                <button
                    onClick={showHintMove}
                    disabled={hintsRemaining <= 0}
                    className={`px-5 py-2 rounded-lg ${themeClasses.button} font-medium flex items-center gap-2 ${hintsRemaining <= 0 ? 'opacity-50' : ''}`}
                >
                    <Lightbulb className="w-4 h-4" />
                    Hint ({hintsRemaining})
                </button>

                <button
                    onClick={() => setShowSettings(true)}
                    className={`px-5 py-2 rounded-lg ${themeClasses.button} font-medium flex items-center gap-2`}
                >
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
            </div>

            {/* Best Scores */}
            <div className="flex justify-center gap-6 w-full max-w-md">
                <div className={`${themeClasses.card} rounded-xl p-3 text-center`}>
                    <p className={`text-xs ${themeClasses.textLight}`}>Best Time</p>
                    <div className={`text-lg font-bold ${themeClasses.text}`}>
                        {bestTime > 0 ? formatTime(bestTime) : '--:--'}
                    </div>
                </div>

                <div className={`${themeClasses.card} rounded-xl p-3 text-center`}>
                    <p className={`text-xs ${themeClasses.textLight}`}>Best Moves</p>
                    <div className={`text-lg font-bold ${themeClasses.text}`}>
                        {bestMoves > 0 ? bestMoves : '--'}
                    </div>
                </div>
            </div>

            {/* Victory Overlay */}
            {isWon && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className={`${themeClasses.modal} rounded-2xl p-8 text-center max-w-sm w-full mx-4`}>
                        <div className="text-5xl mb-4">🎉</div>
                        <h2 className={`text-2xl font-bold ${themeClasses.text} mb-4`}>Puzzle Solved!</h2>
                        <p className={`${themeClasses.textLight} mb-6`}>
                            Completed in {formatTime(timer)} with {moveCount} moves
                        </p>

                        <button
                            onClick={resetGame}
                            className={`px-8 py-3 rounded-lg ${themeClasses.button} font-medium w-full`}
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className={`${themeClasses.modal} rounded-2xl p-6 max-w-sm w-full mx-4`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className={`text-xl font-bold ${themeClasses.text}`}>Settings</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className={`${themeClasses.textLight} hover:${themeClasses.text}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className={`font-medium mb-3 ${themeClasses.text}`}>Difficulty</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setDifficulty(3)}
                                        className={`py-3 rounded-lg ${difficulty === 3 ? themeClasses.button + ' border-2 border-blue-500' : themeClasses.button}`}
                                    >
                                        3×3
                                    </button>
                                    <button
                                        onClick={() => setDifficulty(4)}
                                        className={`py-3 rounded-lg ${difficulty === 4 ? themeClasses.button + ' border-2 border-blue-500' : themeClasses.button}`}
                                    >
                                        4×4
                                    </button>
                                    <button
                                        onClick={() => setDifficulty(5)}
                                        className={`py-3 rounded-lg ${difficulty === 5 ? themeClasses.button + ' border-2 border-blue-500' : themeClasses.button}`}
                                    >
                                        5×5
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className={`font-medium mb-3 ${themeClasses.text}`}>Theme</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setTheme('minimal-light')}
                                        className={`py-3 rounded-lg flex items-center justify-center ${theme === 'minimal-light' ? 'border-2 border-blue-500' : 'border border-gray-300'}`}
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 bg-gray-200 rounded mb-1"></div>
                                            <span className={`text-xs ${themeClasses.text}`}>Light</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setTheme('minimal-dark')}
                                        className={`py-3 rounded-lg flex items-center justify-center ${theme === 'minimal-dark' ? 'border-2 border-blue-500' : 'border border-gray-300'}`}
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 bg-gray-700 rounded mb-1"></div>
                                            <span className={`text-xs ${themeClasses.text}`}>Dark</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setTheme('soft-blue')}
                                        className={`py-3 rounded-lg flex items-center justify-center ${theme === 'soft-blue' ? 'border-2 border-blue-500' : 'border border-gray-300'}`}
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 bg-blue-200 rounded mb-1"></div>
                                            <span className={`text-xs ${themeClasses.text}`}>Blue</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setTheme('warm-sand')}
                                        className={`py-3 rounded-lg flex items-center justify-center ${theme === 'warm-sand' ? 'border-2 border-blue-500' : 'border border-gray-300'}`}
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 bg-amber-200 rounded mb-1"></div>
                                            <span className={`text-xs ${themeClasses.text}`}>Sand</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className={`font-medium mb-3 ${themeClasses.text}`}>Sound</h3>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSoundEnabled(true)}
                                        className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${soundEnabled ? 'bg-blue-100 border border-blue-300' : themeClasses.button}`}
                                    >
                                        <Volume2 className="w-4 h-4" />
                                        <span>On</span>
                                    </button>
                                    <button
                                        onClick={() => setSoundEnabled(false)}
                                        className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${!soundEnabled ? 'bg-gray-100 border border-gray-300' : themeClasses.button}`}
                                    >
                                        <VolumeX className="w-4 h-4" />
                                        <span>Off</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowSettings(false)}
                                className={`w-full py-3 rounded-lg ${themeClasses.button} font-medium`}
                            >
                                Close Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PuzzleGame;