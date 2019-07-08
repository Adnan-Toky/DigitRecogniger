window.onload = function() {
  "use strict";

  var canvasHeight = 200;
  var canvasWidth = 200;

  var mainCanvas = document.getElementById("mainCanvas");
  var tempCanvas = document.getElementById("tempCanvas");
  var resizedCanvas = document.getElementById("resizedCanvas");
  var clearBtn = document.getElementById("clearBtn");

  tempCanvas.style.display = "none";
  resizedCanvas.style.display = "none";

  mainCanvas.height = canvasHeight;
  mainCanvas.width = canvasWidth;

  resizedCanvas.height = 28;
  resizedCanvas.width = 28;

  var ctx1 = mainCanvas.getContext("2d");
  var ctx2 = resizedCanvas.getContext("2d");
  var ctxTemp = tempCanvas.getContext("2d");

  ctx1.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx2.fillRect(0, 0, 28, 28);

  var drawStatus = false;

  function drawStart(e) {
    e.preventDefault();
    var x = e.clientX - mainCanvas.offsetLeft;
    var y = e.clientY - mainCanvas.offsetTop;

    drawStatus = true;

    ctx1.beginPath();
    ctx1.strokeStyle = "#fff";
    ctx1.lineWidth = 5;
    ctx1.lineJoin = "round";
    ctx1.lineCap = "round";
    ctx1.moveTo(x, y);
  }

  function drawContinue(e) {
    e.preventDefault();
    if (drawStatus) {
      var x = e.clientX - mainCanvas.offsetLeft;
      var y = e.clientY - mainCanvas.offsetTop;

      ctx1.lineTo(x, y);
      ctx1.stroke();
    }
  }

  function drawStop() {
    if (drawStatus) {
      ctx1.closePath();
      drawStatus = false;
      drawImageBoundary();
    }
  }

  function drawStartTouch(e) {
    e.preventDefault();
    var to = e.changedTouches[0];
    var x = to.clientX - mainCanvas.offsetLeft;
    var y = to.clientY - mainCanvas.offsetTop;

    drawStatus = true;

    ctx1.beginPath();
    ctx1.strokeStyle = "#fff";
    ctx1.lineWidth = 5;
    ctx1.lineJoin = "round";
    ctx1.lineCap = "round";
    ctx1.moveTo(x, y);
  }

  function drawContinueTouch(e) {
    e.preventDefault();
    if (drawStatus) {
      var to = e.changedTouches[0];
      var x = to.clientX - mainCanvas.offsetLeft;
      var y = to.clientY - mainCanvas.offsetTop;

      ctx1.lineTo(x, y);
      ctx1.stroke();
    }
  }

  mainCanvas.addEventListener("mousedown", drawStart);
  mainCanvas.addEventListener("mousemove", drawContinue);
  mainCanvas.addEventListener("mouseup", drawStop);
  mainCanvas.addEventListener("mouseout", drawStop);
  mainCanvas.addEventListener("touchstart", drawStartTouch);
  mainCanvas.addEventListener("touchmove", drawContinueTouch);
  mainCanvas.addEventListener("touchend", drawStop);

  clearBtn.addEventListener("click", function() {
    ctx1.fillRect(0, 0, canvasWidth, canvasHeight);
  });

  // Image Processing

  function getImageBoundary(imgData) {
    var minX = canvasWidth;
    var maxX = 0;
    var minY = canvasHeight;
    var maxY = 0;

    for (var i = 0; i < canvasHeight * canvasWidth; i++) {
      var pixelGrayScale =
        (imgData[i * 4] + imgData[i * 4 + 1] + imgData[i * 4 + 2]) / 3;
      if (pixelGrayScale > 0) {
        if (i % canvasWidth < minX) minX = i % canvasWidth;
        if (i % canvasWidth > maxX) maxX = i % canvasWidth;
        if (i / canvasHeight < minY) minY = Math.floor(i / canvasHeight);
        if (i / canvasHeight > maxY) maxY = Math.floor(i / canvasHeight);
      }
    }

    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    };
  }

  function drawImageBoundary() {
    var imgData = ctx1.getImageData(0, 0, canvasWidth, canvasHeight).data;
    var boundary = getImageBoundary(imgData);
    // console.log(boundary);
    ctx1.beginPath();
    ctx1.rect(
      boundary.minX - 3,
      boundary.minY - 3,
      boundary.maxX - boundary.minX + 6,
      boundary.maxY - boundary.minY + 6
    );
    ctx1.strokeStyle = "#0a0";
    ctx1.stroke();
    ctx1.closePath();

    compressImg(
      ctx1.getImageData(
        boundary.minX,
        boundary.minY,
        boundary.maxX - boundary.minX,
        boundary.maxY - boundary.minY
      ),
      boundary.maxX - boundary.minX,
      boundary.maxY - boundary.minY
    );
  }

  function compressImg(initImgData, width, height) {
    tempCanvas.height = height;
    tempCanvas.width = width;
    ctxTemp.putImageData(initImgData, 0, 0);
    var imgObject = new Image();
    imgObject.onload = function() {
      ctxTemp.save();
      var padding = 5;
      var paddingLeft = 0;
      var paddingTop = 0;
      ctxTemp.fillRect(0, 0, canvasWidth, canvasHeight);
      if (width > height) {
        ctxTemp.scale((28 - padding * 2) / width, (28 - padding * 2) / width);
        paddingTop = (28 - padding * 2) * (1 - height / width);
      } else {
        ctxTemp.scale((28 - padding * 2) / height, (28 - padding * 2) / height);
        paddingLeft = (28 - padding * 2) * (1 - width / height);
      }
      // ctxTemp.scale((28 - padding * 2) / width, (28 - padding * 2) / height);
      ctxTemp.drawImage(imgObject, 0, 0);
      ctx2.fillRect(0, 0, 28, 28);
      ctx2.putImageData(
        ctxTemp.getImageData(0, 0, 28 - padding * 2, 28 - padding * 2),
        padding + paddingLeft / 2,
        padding + paddingTop / 2
      );

      showData(ctx2.getImageData(0, 0, 28, 28).data);

      ctxTemp.restore();
    };
    imgObject.src = tempCanvas.toDataURL();
  }

  function showData(data) {
    var grayScaleData = [];
    for (var i = 0; i < data.length; i += 4) {
      grayScaleData.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }
    // document.getElementById("data").innerHTML = grayScaleData;
    var prediction = predict(weights, bias, grayScaleData);
    var pMax = 0;
    var pMaxIndex = 0;
    for (var i = 0; i < prediction[prediction.length - 1].length; i++) {
      if (pMax < prediction[prediction.length - 1][i]) {
        pMax = prediction[prediction.length - 1][i];
        pMaxIndex = i;
      }
    }
    document.getElementById("data").innerHTML = pMaxIndex;
  }

  function predict(w, b, x) {
    var num_of_layers = b.length;
    var activations = [x];
    for (var i = 0; i < activations[0].length; i++) {
      activations[0][i] /= 255;
    }

    for (var i = 0; i < num_of_layers; i++) {
      var num_of_nodes = b[i][0].length;
      activations.push([]);
      for (var n = 0; n < num_of_nodes; n++) {
        var activation = 0;
        for (var m = 0; m < w[i][0][n].length; m++) {
          activation += activations[activations.length - 2][m] * w[i][0][n][m];
        }
        activation += b[i][0][n][0];
        if (i == num_of_layers - 1) {
          activation = sigmoid(activation);
        } else {
          activation = relu(activation);
        }
        activations[activations.length - 1].push(activation);
        // console.log(num_of_nodes);
      }
    }

    return activations;
  }
};

function relu(x) {
  if (x <= 0) return 0;
  else {
    return x;
  }
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}
