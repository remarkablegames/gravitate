import type { GameObjects } from 'phaser';
import { type GameObjectProps, Text } from 'phaser-jsx';

type Props = Pick<GameObjectProps<GameObjects.Text>, 'ref' | 'text'>;

/**
 * Help text that has a "fixed" position on the screen.
 */
export function HelpText(props: Props) {
  return (
    <Text
      {...props}
      x={2}
      y={0}
      style={{
        backgroundColor: '#fff',
        color: '#000',
        font: '18px monospace',
        padding: { x: 16, y: 8 },
      }}
    />
  );
}
