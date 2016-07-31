import React from 'react';

// as this component does not have state or actions it can be written as a pure function
const Grid = (kittys) => {
  const kittyNodes = kittys.map(kitty =>
    <li key={kitty.id}>
      <img src="{kitty.src}" alt="cat" />
    </li>
  );

  return (
    <ul>
      {kittyNodes}
    </ul>
  );
};

export default Grid;
