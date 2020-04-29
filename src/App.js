import React, { Component } from "react";
import { Webcam } from "./webcam";
import "./App.css";
import { createWorker } from "tesseract.js";
import Quagga from "quagga";

const worker = createWorker({
  logger: (m) => console.log(m),
});
class App extends Component {
  constructor() {
    super();
    this.webcam = null;
    this.state = {
      capturedImage: null,
      captured: false,
      uploading: false,
      ocr: "",
      barcode: "",
    };
  }

  componentDidMount() {
    // initialize the camera
    this.canvasElement = document.createElement("canvas");
    this.webcam = new Webcam(
      document.getElementById("webcam"),
      this.canvasElement
    );
    this.webcam.setup().catch(() => {
      alert("Error getting access to your camera");
    });
  }

  render() {
    const imageDisplay = this.state.capturedImage ? (
      <img src={this.state.capturedImage} alt="captured" width="350" />
    ) : (
      <span />
    );

    const buttons = this.state.captured ? (
      <div>
        <button className="deleteButton" onClick={this.discardImage}>
          {" "}
          Delete Photo{" "}
        </button>
        <button className="captureButton" onClick={this.doOCR}>
          {" "}
          Read Photo{" "}
        </button>
        <br />
      </div>
    ) : (
      <button className="captureButton" onClick={this.captureImage}>
        {" "}
        Take Picture{" "}
      </button>
    );

    const uploading = this.state.uploading ? (
      <div>
        <p> Uploading Image, please wait ... </p>
      </div>
    ) : (
      <span />
    );

    return (
      <div>
        {uploading}
        <video
          autoPlay
          playsInline
          muted
          id="webcam"
          width="100%"
          height="200%"
        />
        <br />
        <div className="imageCanvas">{imageDisplay}</div>
        {buttons}
        <div>
          <h3>OCR: {this.state.ocr}</h3>
          <h3>Barcode: {this.state.barcode}</h3>
        </div>
      </div>
    );
  }

  captureImage = async () => {
    const capturedData = this.webcam.takeBase64Photo({
      type: "jpeg",
      quality: 0.8,
    });
    console.log(capturedData);
    this.setState({
      captured: true,
      capturedImage: capturedData.base64,
    });
  };

  discardImage = () => {
    this.setState({
      captured: false,
      capturedImage: null,
    });
  };

  doOCR = async () => {
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    const {
      data: { text },
    } = await worker.recognize(this.state.capturedImage);
    // console.log(text);
    this.setState({
      ocr: text,
    });

    Quagga.decodeSingle(
      {
        decoder: {
          readers: ["code_128_reader"], // List of active readers
        },
        locate: true, // try to locate the barcode in the image
        src: this.state.capturedImage, // or 'data:image/jpg;base64,' + data
      },
      (result) => {
        console.log(result);
        if (result) {
          console.log("result", result.codeResult.code);
          this.setState({ barcode: result.codeResult.code });
        } else {
          console.log("not detected");
        }
      }
    );
  };
}
export default App;
