import React from 'react';
import NoCats from './NoCats';
import FlipMove from 'react-flip-move';

// as this component does not have state or actions it can be written as a pure function
const KittyGrid = (props) => {
  const { kittys, onKittyClick } = props;

  if (!kittys.length) {
    return <NoCats />;
  }

  const kittyNodes = () => {
    const rows = [];

    for (let i = 1; i < kittys.length; i = i + 1) {
      rows.push(
        <li
          className={`kitty num${i}`}
          key={kittys[i].id}
          onClick={() => onKittyClick(kittys[i].id)}
        >
          <img src={kittys[i].src} alt="cat" />
          <h3 className="score">{kittys[i].votes}</h3>
        </li>
      );
    }

    return rows;
  };

  return (
    <ul className="catGrid ">
      <FlipMove
        easing="cubic-bezier(0.25, 0.1, 0.25, 1.0)"
        staggerDelayBy={250}
        staggerDurationBy={50}
        enterAnimation="fade"
        leaveAnimation="fade"
      >
        {kittyNodes()}
      </FlipMove>
    </ul>
  );
};

KittyGrid.propTypes = {
  kittys: React.PropTypes.array.isRequired,
  onKittyClick: React.PropTypes.func.isRequired
};

export default KittyGrid;
