import React, { Component } from "react";
import "./App.css";
import { createWorker, createScheduler } from "tesseract.js";
import Quagga from "quagga";
// import label from "./assets/label.jpg";
import CameraPhoto, { FACING_MODES } from "jslib-html5-camera-photo";
import Progress from "react-progressbar";

class App extends Component {
  constructor() {
    super();
    this.cameraPhoto = null;
    this.videoRef = React.createRef();
    this.state = {
      dataUri: "",
      scanning: false,
      capturedImage: [],
      SenderAddress: "",
      ReceiverAddress: "",
      barcode: "",
      progress1: 0,
      progress2: 0,
      croppedImage: "",
      progressText: "",
      textConfidence: null,
      courierService: null,
    };

    this.scheduler = createScheduler();
    this.worker1 = createWorker({
      logger: (m) => {
        console.log(m);
        this.setState({
          progress1: m.progress,
          progressText: m.status,
        });
      },
    });
    this.worker2 = createWorker({
      logger: (m) => {
        console.log(m);
        this.setState({
          progress2: m.progress,
          progressText: m.status,
        });
      },
    });
  }

  componentDidMount() {
    // We need to instantiate CameraPhoto inside componentDidMount because we
    // need the refs.video to get the videoElement so the component has to be
    // mounted.
    this.cameraPhoto = new CameraPhoto(this.videoRef.current);
    this.loadResources();
  }

  loadResources = async () => {
    await this.worker1.load();
    await this.worker2.load();
    await this.worker1.loadLanguage("eng");
    await this.worker2.loadLanguage("eng");
    await this.worker1.initialize("eng");
    await this.worker2.initialize("eng");

    await this.scheduler.addWorker(this.worker1);
    await this.scheduler.addWorker(this.worker2);
  };

  startCamera(idealFacingMode, idealResolution) {
    this.cameraPhoto
      .startCamera(idealFacingMode, idealResolution)
      .then(() => {
        console.log("camera is started !");
      })
      .catch((error) => {
        console.error("Camera not started!", error);
      });
  }

  startCameraMaxResolution = async (idealFacingMode) => {
    this.cameraPhoto
      .startCameraMaxResolution(idealFacingMode)
      .then(() => {
        console.log("camera is started !");
      })
      .catch((error) => {
        console.error("Camera not started!", error);
      });
  };

  scan() {
    this.setState({ scanning: !this.state.scanning });
  }

  stopCamera() {
    this.cameraPhoto
      .stopCamera()
      .then(() => {
        console.log("Camera stoped!");
      })
      .catch((error) => {
        console.log("No camera to stop!:", error);
      });
  }

  startProcessing = async () => {
    Quagga.init(
      {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          constraints: {
            width: window.innerWidth,
            height: window.innerHeight,
            facingMode: "environment", // or user
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        numOfWorkers: 2,
        decoder: {
          readers: ["code_128_reader"],
        },
        locate: true,
      },
      (err) => {
        console.log(this.state.scanning);
        if (this.state.scanning) {
          Quagga.start();
        }
      }
    );
    Quagga.onDetected(this.onDetected.bind(this));
  };

  doOCR = async (image) => {
    const scannedData = await this.worker1.recognize(image);
    console.log(scannedData.data.text);
    scannedData.data.text.search("Amazon");
    if (scannedData.data.confidence > 60) {
      if (scannedData.data.text.includes("Amazon")) {
        this.setState({ courierService: "Amazon" });
        const rectangles = [
          { left: 23, top: 84, width: 254, height: 170 },
          {
            left: 300,
            top: 74,
            width: 347,
            height: 170,
          },
        ];
        console.log(this.state.capturedImage);
        const results = await Promise.all(
          rectangles.map((rectangle) =>
            this.scheduler.addJob("recognize", image, {
              rectangle,
            })
          )
        );
        console.log(results.map((r) => r.data.text));
        // await this.scheduler.terminate();

        console.log(results);
        this.setState(
          {
            SenderAddress: results[0]["data"].text,
            ReceiverAddress: results[1]["data"].text,
            textConfidence:
              (results[0]["data"].confidence + results[1]["data"].confidence) /
              2,
          },
          () => {
            if (this.state.textConfidence < 60) {
              if (
                window.confirm(
                  "Image is not clear. Please rescan",
                  this.state.textConfidence
                )
              ) {
                this.state.capturedImage.length = 0;
              } else {
              }
            }else{
              this.state.capturedImage.length = 0;
            }
          }
        );
      } else if (scannedData.data.text.includes("USPS")) {
        this.setState({ courierService: "United States Postal Service" });
        const rectangles = [
          { left: 73, top: 44, width: 324, height: 90 },
          {
            left: 190,
            top: 134,
            width: 330,
            height: 100,
          },
        ];
        console.log(this.state.capturedImage);
        const results = await Promise.all(
          rectangles.map((rectangle) =>
            this.scheduler.addJob("recognize", image, {
              rectangle,
            })
          )
        );
        console.log(results.map((r) => r.data.text));
        // await this.scheduler.terminate();

        console.log(results);
        this.setState(
          {
            SenderAddress: results[0]["data"].text,
            ReceiverAddress: results[1]["data"].text,
            textConfidence:
              (results[0]["data"].confidence + results[1]["data"].confidence) /
              2,
          },
          () => {
            if (this.state.textConfidence < 60) {
              if (
                window.confirm(
                  "Image is not clear. Please rescan",
                  this.state.textConfidence
                )
              ) {
                this.state.capturedImage.length = 0;
              } else {
              }
            }else{
              this.state.capturedImage.length = 0;
            }
          }
        );
      } else {
        alert("CourierService not Detected");
      }
    } else {
      if (
        window.confirm(
          "Image is not clear. Please Rescan",
          this.state.textConfidence
        )
      ) {
        this.state.capturedImage.length = 0;
      }
    }
  };

  onDetected(result) {
    // Quagga.pause();
    console.log(result);
    const config = {
      sizeFactor: 1,
    };
    let dataUri = this.cameraPhoto.getDataUri(config);

      this.setState(
        {
          // scanning: false,
          capturedImage: [...this.state.capturedImage, dataUri],
          barcode: result.codeResult.code,
        },
        () => {
          if (this.state.capturedImage.length === 1) {
            this.doOCR(this.state.capturedImage[0]);
          }
        }
      );
  }

  render() {
    return (
      <div style={{ margin: 10 }}>
        <div id="interactive" className="viewport">
          <video ref={this.videoRef} autoPlay style={{ width: "100%" }} />
          <canvas
            className="drawingBuffer"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
            }}
          ></canvas>
        </div>
        <button
          onClick={async () => {
            let facingMode = FACING_MODES.USER;
            this.scan();
            setTimeout(() => {
              this.startCameraMaxResolution(facingMode);
              this.startProcessing();
            }, 500);
          }}
        >
          Open Scanner
        </button>
        <br />
        <h4>{this.state.progressText}</h4>
        <Progress
          completed={(this.state.progress1 + this.state.progress2) * 50}
        />{" "}
        <br />
        <div>
          <h3>---------------OCR---------------</h3>
          <h3>Service: {this.state.courierService}</h3>
          <h3>Sender's Address: {this.state.SenderAddress}</h3>
          <h3>Receiver's Address: {this.state.ReceiverAddress}</h3>
          <h3>confidence: {this.state.textConfidence}</h3>

          <h3>-------------BARCODE-------------</h3>
          <h3>Barcode Text: {this.state.barcode}</h3>
        </div>
      </div>
    );
  }
}
export default App;
