import React, { Component } from 'react';
import {BarLoader } from 'react-spinners';
import './css/normalize.css';
import './css/skeleton.css';
import './css/App.css';

class App extends Component {
  constructor(){
   super();
   this.state = {
     text: "",
     loading: false,
     voices: [
      'Amy',
      'Brian',
      'Emma',
      'Aditi',
      'Raveena',
      'Ivy',
      'Joanna',
      'Joey',
      'Justin',
      'Kendra',
      'Kimberly',
      'Matthew',
      'Salli'
     ],
     voice: "Amy",
   }
   this._handleSubmit = this._handleSubmit.bind(this);
   this._updateText = this._updateText.bind(this);
    this._handleSelect = this._handleSelect.bind(this);
  }


  _updateText(e){
    e.preventDefault();
    var text = e.target.value;
    this.setState({text: text});

  }
          // https://github.com/davidhu2000/react-spinners
  _handleSubmit(){
    this.setState({loading: true});
    var data = {text: this.state.text, voice: this.state.voice}

    fetch('http://localhost:3001/submit', {method: 'POST', headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)})
    .then((res)=>{
      return res.json()

    }).then((res)=>{
       var id = res.id
       this.setState({downloadId : id, loading: false});

    });


  }

  _handleSelect(e){
  e.preventDefault();
  var voice = e.target.value;
  this.setState({voice: voice});


  }


  render() {
    return (
      <div>
      <div className="u-full-width nav-bar">
                <div className="logo">
                   <h3> StoryTime </h3>
                </div>
      </div>
      <div className="container">
          <div className="row text">
          <textarea id="input-box" type="text" value={this.state.value} onChange={this._updateText} />
          <button className="button-primary" onClick={this._handleSubmit}>Submit</button>

          <select value={this.state.voices[0]} onChange={this._handleSelect}>
          {this.state.voices.map((v, index) => {
           return (<option key={index} value={v}>{v}</option>)

          })      }
          </select>

          <div className="row">
          <BarLoader color={'#E84A5F'} loading={this.state.loading}/>

          </div>
          {this.state.downloadId ? (<a href={'http://localhost:3001/download/'+ this.state.downloadId + '.mp3'}><button className="button-primary" >Download</button> </a> ):('') }
          </div>
      </div>
      </div>
    );
  }
}

export default App;
