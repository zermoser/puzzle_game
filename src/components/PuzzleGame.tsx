import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Play,
    Pause,
    RotateCcw,
    Trophy,
    Lightbulb,
    Settings,
    Volume2,
    VolumeX,
    Zap,
    Star,
    Award,
    Timer,
    Target,
    Shuffle,
    Eye,
    EyeOff,
    Crown,
    Flame,
    Medal,
    Trophy as TrophyIcon,
    BarChart2,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const PuzzleGame: React.FC = () => {
    // Enhanced state management
    const [tiles, setTiles] = useState<number[]>([]);
    const [isWon, setIsWon] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [moveCount, setMoveCount] = useState<number>(0);
    const [timer, setTimer] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [bestTime, setBestTime] = useState<number>(0);
    const [bestMoves, setBestMoves] = useState<number>(0);
    const [difficulty, setDifficulty] = useState<3 | 4 | 5>(3);
    const [theme, setTheme] = useState<'neon' | 'glass' | 'cyber' | 'cosmic'>('neon');
    const [animatingTiles, setAnimatingTiles] = useState<Set<number>>(new Set());
    const [combo, setCombo] = useState<number>(0);
    const [showCombo, setShowCombo] = useState<boolean>(false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [showStats, setShowStats] = useState<boolean>(false);
    const [streak, setStreak] = useState<number>(0);
    const [perfectMoves, setPerfectMoves] = useState<number>(0);
    const [hintsUsed, setHintsUsed] = useState<number>(0);
    const [gameMode, setGameMode] = useState<'classic' | 'time-attack' | 'moves-limit'>('classic');
    const [timeLimit, setTimeLimit] = useState<number>(300); // 5 minutes
    const [movesLimit, setMovesLimit] = useState<number>(100);
    const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
    const [playerName, setPlayerName] = useState<string>('Player');
    const [achievements, setAchievements] = useState<string[]>([]);
    const [showAchievement, setShowAchievement] = useState<string>('');
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [showHelp, setShowHelp] = useState<boolean>(false);
    const [showAchievementsModal, setShowAchievementsModal] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [isSolving, setIsSolving] = useState<boolean>(false);
    const [showPreview, setShowPreview] = useState<boolean>(false);

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

        for (let i = 0; i < 2000; i++) {
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

    // Check achievements
    const checkAchievements = useCallback(() => {
        const newAchievements: string[] = [];

        if (moveCount <= difficulty * difficulty * 2 && isWon) {
            newAchievements.push('Perfect Solver');
        }
        if (combo >= 10) {
            newAchievements.push('Combo Master');
        }
        if (timer <= 60 && isWon && difficulty >= 3) {
            newAchievements.push('Speed Demon');
        }
        if (hintsUsed === 0 && isWon) {
            newAchievements.push('No Hints Hero');
        }
        if (streak >= 15) {
            newAchievements.push('Unstoppable');
        }
        if (perfectMoves >= 10 && isWon) {
            newAchievements.push('Precision Expert');
        }

        newAchievements.forEach(achievement => {
            if (!achievements.includes(achievement)) {
                setAchievements(prev => [...prev, achievement]);
                setShowAchievement(achievement);
                setTimeout(() => setShowAchievement(''), 3000);
            }
        });
    }, [moveCount, combo, timer, hintsUsed, isWon, difficulty, achievements, streak, perfectMoves]);

    // Timer effect
    useEffect(() => {
        let interval: number;
        if (isPlaying && !isWon && !isPaused && !isSolving) {
            interval = setInterval(() => {
                setTimer(prev => {
                    const newTime = prev + 1;
                    if (gameMode === 'time-attack' && newTime >= timeLimit) {
                        setIsPlaying(false);
                        // Game over
                    }
                    return newTime;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, isWon, isPaused, gameMode, timeLimit, isSolving]);

    // Initialize game
    useEffect(() => {
        resetGame();

        // Mock leaderboard data
        setLeaderboardData([
            { id: 1, name: 'Player', time: 85, moves: 42, score: 950 },
            { id: 2, name: 'Pro Gamer', time: 45, moves: 28, score: 1200 },
            { id: 3, name: 'Puzzle Master', time: 62, moves: 35, score: 1100 },
            { id: 4, name: 'Sliding King', time: 78, moves: 40, score: 1000 },
            { id: 5, name: 'Quick Thinker', time: 50, moves: 30, score: 1150 },
        ]);
    }, [difficulty, shuffleTiles]);

    // Win detection with celebration
    useEffect(() => {
        if (tiles.length > 0 && checkWin(tiles)) {
            setIsWon(true);
            setIsPlaying(false);

            // Update best scores
            if (bestTime === 0 || timer < bestTime) setBestTime(timer);
            if (bestMoves === 0 || moveCount < bestMoves) setBestMoves(moveCount);

            // Check achievements
            checkAchievements();

            // Celebration animation
            setTimeout(() => {
                setAnimatingTiles(new Set(Array.from({ length: difficulty * difficulty }, (_, i) => i)));
                setTimeout(() => setAnimatingTiles(new Set()), 2000);
            }, 500);

            // Play win sound
            playSound('win');
        }
    }, [tiles, timer, moveCount, bestTime, bestMoves, checkWin, checkAchievements, difficulty]);

    // Enhanced move handling
    const handleTileClick = (index: number): void => {
        if (isWon || isPaused || animatingTiles.has(index) || isSolving) return;

        if (gameMode === 'moves-limit' && moveCount >= movesLimit) {
            setIsPlaying(false);
            return;
        }

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

                // Combo system
                setCombo(prev => prev + 1);
                setStreak(prev => prev + 1);

                if (combo > 0 && combo % 5 === 0) {
                    setShowCombo(true);
                    setTimeout(() => setShowCombo(false), 1500);
                }

                // Check if move is optimal
                const isOptimal = checkOptimalMove(index, emptyIndex, newTiles);
                if (isOptimal) {
                    setPerfectMoves(prev => prev + 1);
                }

                setAnimatingTiles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                });
            }, 200);
        } else {
            // Play error sound
            playSound('click');

            // Wrong move animation
            setAnimatingTiles(prev => new Set([...prev, index]));
            setCombo(0);
            setTimeout(() => {
                setAnimatingTiles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                });
            }, 400);
        }
    };

    // Check if move is optimal
    const checkOptimalMove = (clickedIndex: number, emptyIndex: number, newTiles: number[]): boolean => {
        const tile = newTiles[clickedIndex];
        if (tile === 0) return false;

        const targetRow = Math.floor((tile - 1) / difficulty);
        const targetCol = (tile - 1) % difficulty;
        const currentRow = Math.floor(clickedIndex / difficulty);
        const currentCol = clickedIndex % difficulty;

        const oldDistance = Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
        const newDistance = Math.abs(Math.floor(emptyIndex / difficulty) - targetRow) + Math.abs((emptyIndex % difficulty) - targetCol);

        return newDistance < oldDistance;
    };

    // Auto-solve hint with pathfinding
    const showHintMove = (): void => {
        if (hintsUsed >= 3 && gameMode !== 'classic') return;

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
            setHintsUsed(prev => prev + 1);

            setTimeout(() => {
                setAnimatingTiles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(bestMove);
                    return newSet;
                });
            }, 2000);
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
        setCombo(0);
        setStreak(0);
        setPerfectMoves(0);
        setHintsUsed(0);
        setShowCombo(false);
        setAnimatingTiles(new Set());
        setIsSolving(false);
        setShowPreview(false);
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
            case 'neon':
                return {
                    bg: 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
                    card: 'bg-black/30 backdrop-blur-xl border-purple-500/30',
                    tile: 'bg-gradient-to-br from-white to-gray-100 text-gray-800 shadow-lg shadow-purple-500/20',
                    empty: 'bg-purple-500/20 border-2 border-dashed border-purple-400/50',
                    accent: 'text-purple-300',
                    button: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
                    modal: 'bg-gradient-to-br from-purple-800 to-indigo-900'
                };
            case 'glass':
                return {
                    bg: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600',
                    card: 'bg-white/10 backdrop-blur-xl border-white/20',
                    tile: 'bg-white/90 backdrop-blur-sm text-gray-700 shadow-xl',
                    empty: 'bg-white/10 border-2 border-dashed border-white/30',
                    accent: 'text-cyan-200',
                    button: 'bg-white/20 hover:bg-white/30 backdrop-blur-sm',
                    modal: 'bg-gradient-to-br from-cyan-500 to-blue-600'
                };
            case 'cyber':
                return {
                    bg: 'bg-gradient-to-br from-gray-900 via-green-900 to-black',
                    card: 'bg-green-500/10 backdrop-blur-xl border-green-500/30',
                    tile: 'bg-gradient-to-br from-green-400 to-emerald-500 text-black shadow-lg shadow-green-500/20',
                    empty: 'bg-green-500/20 border-2 border-dashed border-green-400/50',
                    accent: 'text-green-300',
                    button: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
                    modal: 'bg-gradient-to-br from-gray-800 to-green-900'
                };
            case 'cosmic':
                return {
                    bg: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
                    card: 'bg-white/5 backdrop-blur-xl border-pink-500/30',
                    tile: 'bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-lg shadow-pink-500/20',
                    empty: 'bg-pink-500/20 border-2 border-dashed border-pink-400/50',
                    accent: 'text-pink-300',
                    button: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700',
                    modal: 'bg-gradient-to-br from-indigo-800 to-pink-900'
                };
            default:
                return getThemeClasses();
        }
    };

    // Auto-solve the puzzle (demo)
    const autoSolve = () => {
        setIsSolving(true);
        setIsPaused(false);
        setIsPlaying(true);

        const solveStep = () => {
            if (isWon || !isSolving) return;

            const emptyIndex = tiles.indexOf(0);
            const validMoves = getValidMoves(emptyIndex);

            if (validMoves.length > 0) {
                const tempTiles = [...tiles];
                let bestMove = validMoves[0];
                let bestScore = -Infinity;

                validMoves.forEach(move => {
                    const temp = [...tempTiles];
                    [temp[move], temp[emptyIndex]] = [temp[emptyIndex], temp[move]];
                    const score = calculatePositionScore(temp);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = move;
                    }
                });

                setAnimatingTiles(prev => new Set([...prev, bestMove]));

                setTimeout(() => {
                    const newTiles = [...tiles];
                    [newTiles[bestMove], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[bestMove]];

                    setTiles(newTiles);
                    setMoveCount(prev => prev + 1);
                    setAnimatingTiles(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(bestMove);
                        return newSet;
                    });

                    if (!checkWin(newTiles)) {
                        setTimeout(solveStep, 300);
                    } else {
                        setIsSolving(false);
                    }
                }, 300);
            }
        };

        solveStep();
    };

    const themeClasses = getThemeClasses();

    // Render the game
    return (
        <div
            className={`min-h-screen ${themeClasses.bg} flex flex-col items-center justify-center p-4 relative overflow-hidden`}
            ref={gameContainerRef}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-10 opacity-20">
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
                    <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
                    <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
                </div>
            </div>

            {/* Floating Particles */}
            {[...Array(20)].map((_, i) => (
                <div
                    key={i}
                    className="absolute rounded-full animate-float"
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        width: `${Math.random() * 10 + 2}px`,
                        height: `${Math.random() * 10 + 2}px`,
                        backgroundColor: theme === 'neon' ? '#a855f7' :
                            theme === 'glass' ? '#38bdf8' :
                                theme === 'cyber' ? '#10b981' : '#ec4899',
                        animationDelay: `${Math.random() * 5}s`,
                        opacity: Math.random() * 0.5 + 0.1
                    }}
                ></div>
            ))}

            {/* Header */}
            <div className="text-center mb-8 relative z-10">
                <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    🧩 PUZZLE UNIVERSE
                </h1>
                <p className="text-xl text-white/80 font-medium">
                    Ultimate Sliding Puzzle Experience
                </p>
            </div>

            {/* Game Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 w-full max-w-4xl relative z-10">
                <div className={`${themeClasses.card} rounded-2xl p-4 text-center border`}>
                    <div className="flex items-center justify-center mb-2">
                        <Timer className="w-6 h-6 text-blue-400 mr-2" />
                        <span className="text-2xl font-bold text-white">{formatTime(timer)}</span>
                    </div>
                    <p className="text-sm text-white/60">Time</p>
                    {gameMode === 'time-attack' && (
                        <div className="mt-2 bg-red-500/20 rounded-full h-2">
                            <div
                                className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${(timer / timeLimit) * 100}%` }}
                            ></div>
                        </div>
                    )}
                </div>

                <div className={`${themeClasses.card} rounded-2xl p-4 text-center border`}>
                    <div className="flex items-center justify-center mb-2">
                        <Target className="w-6 h-6 text-green-400 mr-2" />
                        <span className="text-2xl font-bold text-white">{moveCount}</span>
                    </div>
                    <p className="text-sm text-white/60">Moves</p>
                    {gameMode === 'moves-limit' && (
                        <div className="mt-2 bg-orange-500/20 rounded-full h-2">
                            <div
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(moveCount / movesLimit) * 100}%` }}
                            ></div>
                        </div>
                    )}
                </div>

                <div className={`${themeClasses.card} rounded-2xl p-4 text-center border`}>
                    <div className="flex items-center justify-center mb-2">
                        <Flame className="w-6 h-6 text-orange-400 mr-2" />
                        <span className="text-2xl font-bold text-white">{combo}</span>
                    </div>
                    <p className="text-sm text-white/60">Combo</p>
                    {combo > 0 && (
                        <div className="mt-2 bg-orange-500/20 rounded-full h-2">
                            <div
                                className="bg-orange-500 h-2 rounded-full animate-pulse"
                                style={{ width: `${Math.min((combo / 10) * 100, 100)}%` }}
                            ></div>
                        </div>
                    )}
                </div>

                <div className={`${themeClasses.card} rounded-2xl p-4 text-center border`}>
                    <div className="flex items-center justify-center mb-2">
                        <Crown className="w-6 h-6 text-yellow-400 mr-2" />
                        <span className="text-2xl font-bold text-white">{bestTime > 0 ? formatTime(bestTime) : '--:--'}</span>
                    </div>
                    <p className="text-sm text-white/60">Best Time</p>
                </div>
            </div>

            {/* Game Controls */}
            <div className="flex flex-wrap gap-3 mb-8 justify-center relative z-10">
                <button
                    onClick={() => setShowSettings(true)}
                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2"
                >
                    <Settings className="w-4 h-4" />
                    Settings
                </button>

                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value) as 3 | 4 | 5)}
                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                >
                    <option value={3}>3×3 Easy</option>
                    <option value={4}>4×4 Medium</option>
                    <option value={5}>5×5 Hard</option>
                </select>

                <select
                    value={gameMode}
                    onChange={(e) => setGameMode(e.target.value as 'classic' | 'time-attack' | 'moves-limit')}
                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                >
                    <option value="classic">Classic</option>
                    <option value="time-attack">Time Attack</option>
                    <option value="moves-limit">Moves Limit</option>
                </select>

                <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'neon' | 'glass' | 'cyber' | 'cosmic')}
                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                >
                    <option value="neon">🌟 Neon</option>
                    <option value="glass">💎 Glass</option>
                    <option value="cyber">🤖 Cyber</option>
                    <option value="cosmic">🌌 Cosmic</option>
                </select>

                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2"
                >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                </button>

                <button
                    onClick={showHintMove}
                    disabled={hintsUsed >= 3 && gameMode !== 'classic'}
                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    <Lightbulb className="w-4 h-4" />
                    Hint ({3 - hintsUsed})
                </button>

                <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2"
                >
                    {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPreview ? 'Hide Solution' : 'Show Solution'}
                </button>

                <button
                    onClick={autoSolve}
                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2"
                >
                    <Shuffle className="w-4 h-4" />
                    Auto Solve
                </button>

                <button
                    onClick={resetGame}
                    className={`px-6 py-2 rounded-xl ${themeClasses.button} text-white font-medium transition-all flex items-center gap-2`}
                >
                    <RotateCcw className="w-4 h-4" />
                    New Game
                </button>
            </div>

            {/* Puzzle Grid */}
            <div className={`${themeClasses.card} rounded-3xl p-6 border relative z-10`}>
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
                                disabled={isWon || isPaused || isSolving}
                                className={`
                  aspect-square text-xl font-bold rounded-xl border-2 transition-all duration-300 transform
                  ${isEmpty
                                        ? `${themeClasses.empty} cursor-default`
                                        : `${themeClasses.tile} hover:scale-105 cursor-pointer shadow-lg`
                                    }
                  ${isAnimating ? 'scale-95 rotate-3 shadow-2xl' : ''}
                  ${difficulty === 3 ? 'text-2xl' : difficulty === 4 ? 'text-xl' : 'text-lg'}
                `}
                                style={{
                                    width: `${320 / difficulty}px`,
                                    height: `${320 / difficulty}px`,
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

            {/* Solution Preview */}
            {showPreview && (
                <div className={`${themeClasses.card} rounded-2xl p-4 mt-6 w-full max-w-md text-center border relative z-10`}>
                    <h3 className="text-white font-medium mb-2">Solution Preview</h3>
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${difficulty}, 1fr)` }}>
                        {Array.from({ length: difficulty * difficulty }, (_, i) => i + 1).map((num, index) => (
                            <div
                                key={index}
                                className={`aspect-square flex items-center justify-center rounded-md ${index === difficulty * difficulty - 1 ? themeClasses.empty : themeClasses.tile}`}
                                style={{ width: `${240 / difficulty}px`, height: `${240 / difficulty}px` }}
                            >
                                {index !== difficulty * difficulty - 1 && num}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Game Status */}
            <div className="mt-6 text-center text-white/80 relative z-10">
                <div className="flex items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span>Perfect Moves: {perfectMoves}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-400" />
                        <span>Streak: {streak}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-green-400" />
                        <span>Achievements: {achievements.length}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-lg border-t border-white/10 z-20">
                <div className="max-w-4xl mx-auto flex justify-around p-3">
                    <button
                        onClick={() => setShowLeaderboard(true)}
                        className="flex flex-col items-center text-white/80 hover:text-white transition-all"
                    >
                        <TrophyIcon className="w-6 h-6" />
                        <span className="text-xs mt-1">Leaderboard</span>
                    </button>

                    <button
                        onClick={() => setShowStats(true)}
                        className="flex flex-col items-center text-white/80 hover:text-white transition-all"
                    >
                        <BarChart2 className="w-6 h-6" />
                        <span className="text-xs mt-1">Stats</span>
                    </button>

                    <button
                        onClick={() => setShowAchievementsModal(true)}
                        className="flex flex-col items-center text-white/80 hover:text-white transition-all"
                    >
                        <Medal className="w-6 h-6" />
                        <span className="text-xs mt-1">Achievements</span>
                    </button>

                    <button
                        onClick={() => setShowHelp(true)}
                        className="flex flex-col items-center text-white/80 hover:text-white transition-all"
                    >
                        <Lightbulb className="w-6 h-6" />
                        <span className="text-xs mt-1">Help</span>
                    </button>
                </div>
            </div>

            {/* Combo Display */}
            {showCombo && (
                <div className="fixed top-20 right-8 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 animate-bounce">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <Flame className="w-6 h-6" />
                        COMBO x{combo}!
                    </div>
                </div>
            )}

            {/* Achievement Popup */}
            {showAchievement && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-2xl shadow-2xl z-50 animate-pulse">
                    <div className="flex items-center gap-3 font-bold text-xl">
                        <Trophy className="w-8 h-8 text-yellow-400" />
                        Achievement Unlocked!
                    </div>
                    <p className="text-center mt-2 text-lg">{showAchievement}</p>
                </div>
            )}

            {/* Pause Overlay */}
            {isPaused && !isWon && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
                    <div className={`${themeClasses.card} rounded-3xl p-8 text-center border max-w-md mx-4`}>
                        <Pause className="w-16 h-16 text-white/60 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-4">Game Paused</h2>
                        <p className="text-white/80 mb-6">Take a break and come back when ready!</p>
                        <button
                            onClick={() => setIsPaused(false)}
                            className={`px-8 py-3 rounded-xl ${themeClasses.button} text-white font-medium transition-all flex items-center gap-2 mx-auto`}
                        >
                            <Play className="w-5 h-5" />
                            Resume Game
                        </button>
                    </div>
                </div>
            )}

            {/* Victory Overlay */}
            {isWon && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className={`${themeClasses.card} rounded-3xl p-8 text-center border max-w-lg mx-4`}>
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-bold text-white mb-4">Congratulations!</h2>
                        <p className="text-white/80 mb-6">
                            Puzzle solved in {formatTime(timer)} with {moveCount} moves!
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-sm text-white/60">Score</div>
                                <div className="text-xl font-bold text-white">
                                    {Math.max(1000 - moveCount * 10 - timer, 100)}
                                </div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-sm text-white/60">Perfect Moves</div>
                                <div className="text-xl font-bold text-white">{perfectMoves}</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-sm text-white/60">Combo</div>
                                <div className="text-xl font-bold text-white">{combo}x</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3">
                                <div className="text-sm text-white/60">Hints Used</div>
                                <div className="text-xl font-bold text-white">{hintsUsed}</div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => {
                                    resetGame();
                                }}
                                className={`px-8 py-3 rounded-xl ${themeClasses.button} text-white font-medium transition-all flex items-center gap-2 justify-center`}
                            >
                                <Shuffle className="w-5 h-5" />
                                Play Again
                            </button>
                            <button
                                onClick={() => setShowLeaderboard(true)}
                                className={`px-8 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium transition-all flex items-center gap-2 justify-center`}
                            >
                                <Trophy className="w-5 h-5" />
                                View Leaderboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`${themeClasses.modal} rounded-3xl border border-white/20 max-w-md w-full overflow-hidden`}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Game Settings</h2>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="text-white/70 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-white font-medium mb-3">Sound</h3>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setSoundEnabled(true)}
                                            className={`px-6 py-3 rounded-xl flex items-center gap-2 ${soundEnabled ? themeClasses.button : 'bg-white/10'}`}
                                        >
                                            <Volume2 className="w-5 h-5" />
                                            <span>On</span>
                                        </button>
                                        <button
                                            onClick={() => setSoundEnabled(false)}
                                            className={`px-6 py-3 rounded-xl flex items-center gap-2 ${!soundEnabled ? 'bg-red-500/80' : 'bg-white/10'}`}
                                        >
                                            <VolumeX className="w-5 h-5" />
                                            <span>Off</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-3">Game Mode</h3>
                                    <select
                                        value={gameMode}
                                        onChange={(e) => setGameMode(e.target.value as 'classic' | 'time-attack' | 'moves-limit')}
                                        className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                                    >
                                        <option value="classic">Classic (No limits)</option>
                                        <option value="time-attack">Time Attack</option>
                                        <option value="moves-limit">Moves Limit</option>
                                    </select>

                                    {gameMode === 'time-attack' && (
                                        <div className="mt-3">
                                            <label className="text-white/80 text-sm mb-1 block">Time Limit (seconds)</label>
                                            <input
                                                type="number"
                                                value={timeLimit}
                                                onChange={(e) => setTimeLimit(Number(e.target.value))}
                                                className="w-full px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                                            />
                                        </div>
                                    )}

                                    {gameMode === 'moves-limit' && (
                                        <div className="mt-3">
                                            <label className="text-white/80 text-sm mb-1 block">Moves Limit</label>
                                            <input
                                                type="number"
                                                value={movesLimit}
                                                onChange={(e) => setMovesLimit(Number(e.target.value))}
                                                className="w-full px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-3">Player Name</h3>
                                    <input
                                        type="text"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                                    />
                                </div>

                                <button
                                    onClick={() => setShowSettings(false)}
                                    className={`w-full py-3 rounded-xl ${themeClasses.button} text-white font-medium transition-all flex items-center gap-2 justify-center`}
                                >
                                    Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal */}
            {showLeaderboard && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`${themeClasses.modal} rounded-3xl border border-white/20 max-w-2xl w-full overflow-hidden`}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
                                <button
                                    onClick={() => setShowLeaderboard(false)}
                                    className="text-white/70 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-white">
                                    <thead>
                                        <tr className="border-b border-white/20">
                                            <th className="py-3 text-left">Rank</th>
                                            <th className="py-3 text-left">Player</th>
                                            <th className="py-3 text-center">Time</th>
                                            <th className="py-3 text-center">Moves</th>
                                            <th className="py-3 text-right">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboardData.map((entry, index) => (
                                            <tr
                                                key={entry.id}
                                                className={`border-b border-white/10 ${entry.name === 'Player' ? 'bg-white/10' : ''}`}
                                            >
                                                <td className="py-3">
                                                    {index === 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <Crown className="w-5 h-5 text-yellow-400" />
                                                            <span>1st</span>
                                                        </div>
                                                    ) : index === 1 ? (
                                                        <div className="flex items-center gap-2">
                                                            <Medal className="w-5 h-5 text-gray-300" />
                                                            <span>2nd</span>
                                                        </div>
                                                    ) : index === 2 ? (
                                                        <div className="flex items-center gap-2">
                                                            <Medal className="w-5 h-5 text-amber-700" />
                                                            <span>3rd</span>
                                                        </div>
                                                    ) : (
                                                        `${index + 1}th`
                                                    )}
                                                </td>
                                                <td className="py-3 font-medium">{entry.name}</td>
                                                <td className="py-3 text-center">{formatTime(entry.time)}</td>
                                                <td className="py-3 text-center">{entry.moves}</td>
                                                <td className="py-3 text-right font-bold">{entry.score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center mt-6">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all disabled:opacity-30 flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Prev
                                </button>

                                <div className="text-white/80">Page {currentPage} of 3</div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, 3))}
                                    disabled={currentPage === 3}
                                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all disabled:opacity-30 flex items-center gap-2"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            {showStats && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`${themeClasses.modal} rounded-3xl border border-white/20 max-w-md w-full overflow-hidden`}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Game Statistics</h2>
                                <button
                                    onClick={() => setShowStats(false)}
                                    className="text-white/70 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white/10 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-white">{12}</div>
                                    <div className="text-white/60 text-sm">Games Played</div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-white">{7}</div>
                                    <div className="text-white/60 text-sm">Games Won</div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-white">{formatTime(bestTime)}</div>
                                    <div className="text-white/60 text-sm">Best Time</div>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-white">{bestMoves}</div>
                                    <div className="text-white/60 text-sm">Best Moves</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-white/80 text-sm mb-1">
                                        <span>Average Time</span>
                                        <span>{formatTime(85)}</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-white/80 text-sm mb-1">
                                        <span>Average Moves</span>
                                        <span>42</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: '50%' }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-white/80 text-sm mb-1">
                                        <span>Win Rate</span>
                                        <span>58%</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full" style={{ width: '58%' }}></div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowStats(false)}
                                className={`w-full py-3 rounded-xl ${themeClasses.button} text-white font-medium transition-all flex items-center gap-2 justify-center mt-6`}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Achievements Modal */}
            {showAchievementsModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`${themeClasses.modal} rounded-3xl border border-white/20 max-w-md w-full overflow-hidden`}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Achievements</h2>
                                <button
                                    onClick={() => setShowAchievementsModal(false)}
                                    className="text-white/70 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { title: 'First Win', description: 'Win your first game', earned: true },
                                    { title: 'Speed Demon', description: 'Solve under 60 seconds', earned: achievements.includes('Speed Demon') },
                                    { title: 'Perfect Solver', description: 'Solve with minimal moves', earned: achievements.includes('Perfect Solver') },
                                    { title: 'Combo Master', description: 'Achieve 10x combo', earned: achievements.includes('Combo Master') },
                                    { title: 'No Hints Hero', description: 'Win without hints', earned: achievements.includes('No Hints Hero') },
                                    { title: 'Precision Expert', description: '10 perfect moves in one game', earned: achievements.includes('Precision Expert') },
                                    { title: 'Unstoppable', description: '15-move streak', earned: achievements.includes('Unstoppable') },
                                    { title: 'Puzzle Master', description: 'Win 10 games', earned: false },
                                ].map((achievement, index) => (
                                    <div
                                        key={index}
                                        className={`rounded-xl p-4 border ${achievement.earned ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-white/5'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${achievement.earned ? 'bg-yellow-400/20' : 'bg-white/10'}`}>
                                                <Trophy className={`w-5 h-5 ${achievement.earned ? 'text-yellow-400' : 'text-white/30'}`} />
                                            </div>
                                            <div>
                                                <h3 className={`font-medium ${achievement.earned ? 'text-yellow-300' : 'text-white/70'}`}>
                                                    {achievement.title}
                                                </h3>
                                                <p className="text-sm text-white/60">{achievement.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 text-center text-white/60">
                                {achievements.length} of 8 achievements unlocked
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`${themeClasses.modal} rounded-3xl border border-white/20 max-w-md w-full overflow-hidden`}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">How to Play</h2>
                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="text-white/70 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4 text-white/80">
                                <div>
                                    <h3 className="text-white font-medium mb-2">Objective</h3>
                                    <p>Rearrange the tiles in numerical order by sliding them into the empty space. The solved puzzle has numbers 1 to (n²-1) in order with the empty space at the bottom right.</p>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-2">Controls</h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Click on any tile adjacent to the empty space to move it</li>
                                        <li>Use the "Hint" button to highlight the next best move</li>
                                        <li>"Auto Solve" will demonstrate the solution</li>
                                        <li>"Show Solution" displays the solved puzzle as reference</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-2">Game Modes</h3>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2">
                                            <span className="bg-white/10 px-2 py-1 rounded text-xs">Classic</span>
                                            <span>No limits, solve at your own pace</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="bg-red-500/20 px-2 py-1 rounded text-xs">Time Attack</span>
                                            <span>Solve before time runs out</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="bg-orange-500/20 px-2 py-1 rounded text-xs">Moves Limit</span>
                                            <span>Solve within the move limit</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowHelp(false)}
                                className={`w-full py-3 rounded-xl ${themeClasses.button} text-white font-medium transition-all flex items-center gap-2 justify-center mt-6`}
                            >
                                Got It!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PuzzleGame;