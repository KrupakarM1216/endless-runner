# Endless Runner

A simple endless runner game built with Expo (React Native) — tap the screen to jump over obstacles, survive as long as possible, and try to beat your high score.

## Features

- Home screen with title and Start button
- Tap-to-jump gameplay with gravity physics
- Randomly generated obstacles with increasing speed over time
- Score counter that increases as you survive
- Collision detection and Game Over screen
- Restart button
- High score saved locally on the device (AsyncStorage), shown on Home and Game Over screens

## Setup and Run

Requirements: Node.js installed, and the **Expo Go** app installed on your Android phone.

```bash
git clone <your-repo-url>
cd endless-runner
npm install
npx expo start
```

Then scan the QR code shown in the terminal/browser using the **Expo Go** app on your Android phone.

## How to Play

- Tap **Start** on the home screen.
- Tap anywhere on the screen to jump over the incoming obstacles.
- Colliding with an obstacle ends the run and shows your final score.
- Tap **Restart** to play again. Your best score is saved automatically.

## Project Structure

```
endless-runner/
├── App.js          # All game logic and UI
├── app.json         # Expo app configuration
├── babel.config.js
├── package.json
└── README.md
```
