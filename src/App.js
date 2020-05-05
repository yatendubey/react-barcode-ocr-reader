import React, { Component } from "react";
import "./App.css";
import { createWorker } from "tesseract.js";
import Quagga from "quagga";
import label from "./assets/label.jpg";
import Camera, { FACING_MODES, IMAGE_TYPES } from "react-html5-camera-photo";
import "react-html5-camera-photo/build/css/index.css";
import Progress from "react-progressbar";
import Cropper from "react-easy-crop";
import getCroppedImg from "./cropImage";

class App extends Component {
  constructor() {
    super();
    this.state = {
      capturedImage: null,
      captured: false,
      uploading: false,
      SenderAddress: "",
      ReceiverAddress: "",
      barcode: "",
      progress: 0,
      croppedImage: "",

      image: label,
      crop: { x: 0, y: 0 },
      zoom: 3,
      aspect: 1,
      croppedAreaPixels: null,
    };

    this.worker = createWorker({
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(m);
          this.setState({
            progress: m.progress * 100,
          });
        }
      },
    });
  }

  handleTakePhoto = (dataUri) => {
    // Do stuff with the photo...
    this.setState({ capturedImage: dataUri });
  };

  discardImage = () => {
    this.setState({
      captured: false,
      capturedImage: null,
      SenderAddress: "",
      ReceiverAddress: "",
      barcode: "",
      progress: 0
    });
  };

  doOCR = async () => {
    const croppedImage = await getCroppedImg(
      label,
      this.state.croppedAreaPixels
    );
    this.setState({ croppedImage: croppedImage }, () => {
      console.log(this.state.croppedImage)
      Quagga.decodeSingle(
        {
          decoder: {
            readers: ["code_128_reader"], // List of active readers
          },
          locate: true, // try to locate the barcode in the image
          // src: this.state.capturedImage, // or 'data:image/jpg;base64,' + data
          src: this.state.croppedImage,
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
    });

    await this.worker.load();
    await this.worker.loadLanguage("eng");
    await this.worker.initialize("eng");

    const rectangles = [
      { left: 1560, top: 1066, width: 210, height: 122 },
      {
        left: 1900,
        top: 1066,
        width: 325,
        height: 135,
      },
    ];

    const values = [];
    for (let i = 0; i < rectangles.length; i++) {
      const {
        data: { text },
      } = await this.worker.recognize(label, {
        rectangle: rectangles[i],
      });
      values.push(text);
    }
    console.log(values);
    await this.worker.terminate();

    this.setState({
      SenderAddress: values[0],
      ReceiverAddress: values[1],
    });
  };

  onCropChange = (crop) => {
    this.setState({ crop });
  };

  onCropComplete = (croppedArea, croppedAreaPixels) => {
    this.setState({ croppedAreaPixels });
  };

  onZoomChange = (zoom) => {
    this.setState({ zoom });
  };

  render() {
    const buttons = this.state.capturedImage ? (
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
    ) : null;

    return (
      <div>
        <Camera
          onTakePhoto={(dataUri) => {
            this.handleTakePhoto(dataUri);
          }}
          idealFacingMode={FACING_MODES.ENVIRONMENT}
          imageType={IMAGE_TYPES.JPG}
          imageCompression={0}
          isMaxResolution={true}
          isFullscreen={false}
          sizeFactor={1}
          isImageMirror={false}
        />
        {this.state.capturedImage ? (
          <div>
            <div
              style={{ position: "relative", width: "400px", height: "400px" }}
            >
              <Cropper
                image={this.state.image}
                crop={this.state.crop}
                zoom={this.state.zoom}
                aspect={this.state.aspect}
                onCropChange={this.onCropChange}
                onCropComplete={this.onCropComplete}
                onZoomChange={this.onZoomChange}
              />
            </div>
          </div>
        ) : (
          ""
        )}
        {buttons}
        <br />
        <Progress completed={this.state.progress} /> <br />
        <div>
          <h3>---------------OCR---------------</h3>
          <h3>Sender's Address: {this.state.SenderAddress}</h3>
          <h3>Receiver's Address: {this.state.ReceiverAddress}</h3>

          <h3>-------------BARCODE-------------</h3>
          <h3>Barcode Text: {this.state.barcode}</h3>
        </div>
      </div>
    );
  }
}
export default App;
