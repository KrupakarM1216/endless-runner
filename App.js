import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- Game constants ----------
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GROUND_HEIGHT = 90;
const GROUND_Y = SCREEN_HEIGHT - GROUND_HEIGHT;

const PLAYER_SIZE = 42;
const PLAYER_X = 36;
const GRAVITY = 1.1;
const JUMP_VELOCITY = 17;

const TICK_MS = 16; // ~60 fps
const INITIAL_SPEED = 6;
const MAX_SPEED = 14;
const SPEED_RAMP_EVERY = 300; // score points needed to bump speed
const OBSTACLE_MIN_GAP_PX = 220;
const OBSTACLE_MAX_GAP_PX = 420;

const HIGH_SCORE_KEY = '@endless_runner_high_score';

let obstacleIdCounter = 0;

function makeObstacle(spawnX) {
  obstacleIdCounter += 1;
  const height = 30 + Math.floor(Math.random() * 40); // 30 - 70
  const width = 24 + Math.floor(Math.random() * 16); // 24 - 40
  return { id: obstacleIdCounter, x: spawnX, width, height };
}

const initialGameState = () => ({
  playerY: 0, // height above ground, 0 = standing on ground
  velocity: 0,
  obstacles: [makeObstacle(SCREEN_WIDTH + 100)],
  score: 0,
  distance: 0,
  speed: INITIAL_SPEED,
});

export default function App() {
  // 'home' | 'playing' | 'gameover'
  const [screen, setScreen] = useState('home');
  const [game, setGame] = useState(initialGameState());
  const [highScore, setHighScore] = useState(0);
  const intervalRef = useRef(null);

  // Load saved high score on first mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (saved !== null) {
          setHighScore(parseInt(saved, 10) || 0);
        }
      } catch (e) {
        // ignore read errors, high score just stays at 0
      }
    })();
  }, []);

  const saveHighScoreIfNeeded = useCallback(async (finalScore) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
      try {
        await AsyncStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
      } catch (e) {
        // ignore write errors
      }
    }
  }, [highScore]);

  const endGame = useCallback((finalScore) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setScreen('gameover');
    saveHighScoreIfNeeded(finalScore);
  }, [saveHighScoreIfNeeded]);

  const startGame = useCallback(() => {
    obstacleIdCounter = 0;
    setGame(initialGameState());
    setScreen('playing');
  }, []);

  // Main game loop
  useEffect(() => {
    if (screen !== 'playing') return undefined;

    intervalRef.current = setInterval(() => {
      setGame((prev) => {
        // --- physics: jumping / gravity ---
        let velocity = prev.velocity - GRAVITY;
        let playerY = prev.playerY + velocity;
        if (playerY <= 0) {
          playerY = 0;
          velocity = 0;
        }

        // --- move obstacles ---
        let obstacles = prev.obstacles
          .map((o) => ({ ...o, x: o.x - prev.speed }))
          .filter((o) => o.x + o.width > -50);

        // --- spawn new obstacle if there's room ---
        const last = obstacles[obstacles.length - 1];
        const shouldSpawn =
          !last || last.x < SCREEN_WIDTH - OBSTACLE_MIN_GAP_PX -
            Math.random() * (OBSTACLE_MAX_GAP_PX - OBSTACLE_MIN_GAP_PX);
        if (shouldSpawn) {
          obstacles = [...obstacles, makeObstacle(SCREEN_WIDTH + 40)];
        }

        // --- score & difficulty ramp ---
        const distance = prev.distance + prev.speed;
        const score = Math.floor(distance / 10);
        const speed = Math.min(
          MAX_SPEED,
          INITIAL_SPEED + Math.floor(score / SPEED_RAMP_EVERY)
        );

        // --- collision detection ---
        const playerLeft = PLAYER_X;
        const playerRight = PLAYER_X + PLAYER_SIZE;
        const playerTop = GROUND_Y - PLAYER_SIZE - playerY;
        const playerBottom = playerTop + PLAYER_SIZE;

        const hit = obstacles.some((o) => {
          const oLeft = o.x;
          const oRight = o.x + o.width;
          const oTop = GROUND_Y - o.height;
          const oBottom = GROUND_Y;
          return (
            playerRight > oLeft &&
            playerLeft < oRight &&
            playerBottom > oTop &&
            playerTop < oBottom
          );
        });

        if (hit) {
          // schedule end-of-game outside the updater to avoid nested setState issues
          setTimeout(() => endGame(score), 0);
        }

        return { playerY, velocity, obstacles, score, distance, speed };
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [screen, endGame]);

  const handleJump = useCallback(() => {
    if (screen !== 'playing') return;
    setGame((prev) => {
      if (prev.playerY > 0) return prev; // already in the air
      return { ...prev, velocity: JUMP_VELOCITY };
    });
  }, [screen]);

  // ---------- Rendering ----------

  if (screen === 'home') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <Text style={styles.title}>Endless Runner</Text>
        <Text style={styles.subtitle}>Tap to jump. Dodge the blocks!</Text>
        <Text style={styles.highScoreText}>High Score: {highScore}</Text>
        <Pressable style={styles.button} onPress={startGame}>
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>
      </View>
    );
  }

  if (screen === 'gameover') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <Text style={styles.title}>Game Over</Text>
        <Text style={styles.subtitle}>Score: {game.score}</Text>
        <Text style={styles.highScoreText}>High Score: {highScore}</Text>
        <Pressable style={styles.button} onPress={startGame}>
          <Text style={styles.buttonText}>Restart</Text>
        </Pressable>
      </View>
    );
  }

  // screen === 'playing'
  const playerTop = GROUND_Y - PLAYER_SIZE - game.playerY;

  return (
    <Pressable style={styles.gameArea} onPress={handleJump}>
      <StatusBar hidden />

      {/* Score */}
      <View style={styles.scoreBar}>
        <Text style={styles.scoreText}>Score: {game.score}</Text>
        <Text style={styles.scoreText}>Best: {highScore}</Text>
      </View>

      {/* Ground */}
      <View style={[styles.ground, { top: GROUND_Y, height: GROUND_HEIGHT }]} />

      {/* Player */}
      <View
        style={[
          styles.player,
          { left: PLAYER_X, top: playerTop, width: PLAYER_SIZE, height: PLAYER_SIZE },
        ]}
      />

      {/* Obstacles */}
      {game.obstacles.map((o) => (
        <View
          key={o.id}
          style={[
            styles.obstacle,
            {
              left: o.x,
              top: GROUND_Y - o.height,
              width: o.width,
              height: o.height,
            },
          ]}
        />
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#123',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#234',
    marginBottom: 16,
  },
  highScoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#123',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#2E8B57',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  gameArea: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  scoreBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#123',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#6B4226',
  },
  player: {
    position: 'absolute',
    backgroundColor: '#E74C3C',
    borderRadius: 8,
  },
  obstacle: {
    position: 'absolute',
    backgroundColor: '#2C3E50',
    borderRadius: 4,
  },
});
