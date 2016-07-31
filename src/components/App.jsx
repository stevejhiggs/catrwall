import React from 'react';
import Grid from './Grid';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { kittys: [] };
    this.hz = props.hz;
  }

  componentDidMount() {
    const cats = this.hz('cats');
    cats.order('votes').watch().subscribe(
      (items) => {
        this.setState({ kittys: items });
      },
      // If an error occurs, this function
      //  will execute with the `err` message
      (err) => {
        console.log(err);
      }
    );
  }

  render() {
    return (
      <div>
        <div className="page-header">
          <h1>All the cats...but which is best?</h1>
        </div>
        <Grid kittys={this.state.kittys} />
      </div>
    );
  }
}

App.propTypes = {
  hz: React.PropTypes.object
};

export default App;
