import React from 'react';
import NoCats from './NoCats';

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
        <div className="kitty" key={kittys[i].id} onClick={() => onKittyClick(kittys[i].id)}>
          <img src={kittys[i].src} alt="cat" />
          <h3 className="score">{kittys[i].votes}</h3>
        </div>
      );
    }

    return rows;
  };

  return (
    <div>
      <div id="featuredKitty" key={kittys[0].id} onClick={() => onKittyClick(kittys[0].id)}>
        <img src={kittys[0].src} alt="cat" />
        <h3 className="score">{kittys[0].votes}</h3>
      </div>
      <div className="catGrid">
        {kittyNodes()}
      </div>
    </div>
  );
};

KittyGrid.propTypes = {
  kittys: React.PropTypes.array.isRequired,
  onKittyClick: React.PropTypes.func.isRequired
};

export default KittyGrid;
