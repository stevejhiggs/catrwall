import React from 'react';
import { Grid, Row, Col, Thumbnail } from 'react-bootstrap';

// as this component does not have state or actions it can be written as a pure function
const KittyGrid = (props) => {
  const kittyNodes = () => {
    const rows = [];
    for (let i = 0; i < props.kittys.length - 2; i = i + 2) {
      rows.push(<Row key={i}>
        <Col sm={6} md={6} lg={6} key={props.kittys[i].id}>
          <Thumbnail responsive rounded thumbnail src={props.kittys[i].src} alt="cat" >
          </Thumbnail>
        </Col>
        <Col sm={6} md={6} lg={6} key={props.kittys[i + 1].id}>
          <Thumbnail responsive rounded thumbnail src={props.kittys[i + 1].src} alt="cat" >
          </Thumbnail>
        </Col>
      </Row>);
    }

    return rows;
  };

  return (
    <Grid fluid>
      {kittyNodes()}
    </Grid>
  );
};

KittyGrid.propTypes = {
  kittys: React.PropTypes.array
};

export default KittyGrid;
