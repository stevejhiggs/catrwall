import FlipMove from 'react-flip-move';
import NoCats from './NoCats';

export interface Cat {
  id: string;
  src: string;
  votes: number;
}

interface KittyGridProps {
  kittys: Cat[];
  onKittyClick: (id: string) => void;
}

// as this component does not have state or actions it can be written as a pure function
export const KittyGrid: React.FC<KittyGridProps> = (props) => {
  const { kittys, onKittyClick } = props;

  if (!kittys.length) {
    return <NoCats />;
  }

  const kittyNodes = () => {
    const rows = [];

    for (let i = 0; i < kittys.length; i++) {
      rows.push(
        <div
          className={`kitty num${i}`}
          key={kittys[i].id}
          onClick={() => onKittyClick(kittys[i].id)}
          onKeyDown={(e) => e.key === 'Enter' && onKittyClick(kittys[i].id)}
          tabIndex={0}
          role="button"
        >
          <img src={kittys[i].src} alt="cat" />
          <h3 className="score">{kittys[i].votes}</h3>
        </div>
      );
    }

    return rows;
  };

  return (
    <FlipMove
      easing="cubic-bezier(0.25, 0.1, 0.25, 1.0)"
      staggerDelayBy={150}
      staggerDurationBy={25}
      enterAnimation="fade"
      leaveAnimation="fade"
      className="catGrid"
      duration={300}
    >
      {kittyNodes()}
    </FlipMove>
  );
};
