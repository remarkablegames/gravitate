import type Phaser from 'phaser';
import { type GameObjectProps, Text } from 'phaser-jsx';

type Props = Pick<GameObjectProps<Phaser.GameObjects.Text>, 'ref'>;

/**
 * Help text that has a "fixed" position on the screen.
 */
export function HelpText(props: Props) {
  return (
    <Text
      ref={props.ref}
      x={2}
      y={0}
      text={['WASD or arrow keys to move'].join('\n')}
      style={{
        backgroundColor: '#fff',
        color: '#000',
        font: '18px monospace',
        padding: { x: 16, y: 8 },
      }}
    />
  );
}
