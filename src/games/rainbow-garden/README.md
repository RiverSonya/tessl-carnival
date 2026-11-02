# Rainbow Garden

Walk around the garden picking flowers. After a surprise number of them, a
rainbow appears somewhere in the garden, and you have 5 seconds to reach it
without touching a single flower. Every rainbow you catch makes the garden
fuller, so the next run is trickier.

## How to play

- Walk with the arrow keys or W, A, S and D.
- Walk into a flower (tulip, daisy, bluebell or sunflower) to pick it. A new
  flower grows somewhere else.
- A rainbow appears after a random number of flowers, anywhere from 3 to 7,
  in a surprise spot. A ring around it shows the time left. Each rainbow rolls
  a new number.
- While the rainbow is out, flowers are in your way: touch one and the round
  ends. Let the 5 seconds run out and the round ends too.
- Reach the rainbow and the garden grows back with 3 more flowers than before
  (14 to start, up to 32), and you start picking again.
- Click or press Space on the game over screen to play another round.

## Scoring

| What               | Points |
| ------------------ | ------ |
| Picking a flower   | 10     |
| Reaching a rainbow | 50     |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `spawnRainbow`,
  `touchesFlower`, `flowerCount`, `rollRainbowAt`) and the `rainbowGarden` entry, the default export the midway
  finds.
- `game.test.ts`: tests for the game logic.
