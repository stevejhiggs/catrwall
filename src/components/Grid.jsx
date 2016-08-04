import React from 'react';
import { Grid, Row, Col, Thumbnail } from 'react-bootstrap';

// as this component does not have state or actions it can be written as a pure function
const KittyGrid = (props) => {
  const { kittys, onKittyClick } = props;

  const kittyNodes = () => {
    const rows = [];
    for (let i = 0; i < kittys.length - 2; i = i + 2) {
      rows.push(<Row key={i}>
        <Col sm={6} md={6} lg={6} key={kittys[i].id}>
          <Thumbnail src={kittys[i].src} alt="cat" onClick={() => onKittyClick(kittys[i].id)} >
            <h3>{kittys[i].votes}</h3>
          </Thumbnail>
        </Col>
        <Col sm={6} md={6} lg={6} key={kittys[i + 1].id}>
          <Thumbnail
            src={kittys[i + 1].src}
            alt="cat"
            onClick={() => onKittyClick(kittys[i + 1].id)}
          >
            <h3>{kittys[i + 1].votes}</h3>
          </Thumbnail>
        </Col>
      </Row>);
    }

    return rows;
  };

  return (
    <Grid fluid className="catGrid">
      {kittyNodes()}
    </Grid>
  );
};

KittyGrid.propTypes = {
  kittys: React.PropTypes.array.isRequired,
  onKittyClick: React.PropTypes.func.isRequired
};

export default KittyGrid;
