# Rainbow Garden

Walk around the garden picking flowers. Every fifth flower makes a rainbow
appear somewhere in the garden, and you have 5 seconds to reach it without
touching a single flower.

## How to play

- Walk with the arrow keys or W, A, S and D.
- Walk into a flower (tulip, daisy, bluebell or sunflower) to pick it. A new
  flower grows somewhere else.
- When you pick your fifth flower, a rainbow appears in a surprise spot. A ring
  around it shows the time left.
- While the rainbow is out, flowers are in your way: touch one and the round
  ends. Let the 5 seconds run out and the round ends too.
- Reach the rainbow and the garden grows back, and you start picking again.
- Click or press Space on the game over screen to play another round.

## Scoring

| What               | Points |
| ------------------ | ------ |
| Picking a flower   | 10     |
| Reaching a rainbow | 50     |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `spawnRainbow`,
  `touchesFlower`) and the `rainbowGarden` entry, the default export the midway
  finds.
- `game.test.ts`: tests for the game logic.
