let checkDoneInterval = null;

$(".upload-btn").on("click", function () {
  $("#upload-input").click();
  $(".progress-bar").text("0%");
  $(".progress-bar").width("0%");
  $(".upload-btn").eq(0)[0].disabled = true;
});

$("#upload-input").on("change", function () {
  const files = $(this).get(0).files;
  const xhrModifier = () => {
    const xmlHttpRequest = new XMLHttpRequest();
    const onEvent = (event) => {
      if (!event.lengthComputable) return;

      // calculate the percentage of upload completed
      var percentComplete = event.loaded / event.total;
      percentComplete = parseInt(percentComplete * 100);

      // update the Bootstrap progress bar with the new percentage
      $(".progress-bar").text(percentComplete + "%");
      $(".progress-bar").width(percentComplete + "%");

      // once the upload reaches 100%, set the progress bar text to done
      if (percentComplete === 100) $(".progress-bar").html("Done Uploading. Please Wait. May take up to 2 minutes");
    };

    xmlHttpRequest.upload.addEventListener("progress", onEvent, false);
    return xmlHttpRequest;
  };

  if (!(files.length > 0)) return;

  var formData = new FormData();

  // loop through all the selected files
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    formData.append("uploads[]", file, file.name); // add the files to formData object for the data payload
  }

  $.ajax({
    url: "/upload",
    type: "POST",
    data: formData,
    processData: false,
    contentType: false,
    xhr: xhrModifier,
    success: function (data) {
      console.log("upload successful!");
      checkDoneInterval = setInterval(checkDone, 2500);
    }
  });
});

function checkDone() {
  $.ajax({
    url: "/check",
    type: "GET",
    success: (data) => {
      console.log('Pack ready?', data);
      if (/false/.test(data)) return;

      clearInterval(checkDoneInterval);
      window.location.href = data; // initiates download as pack is in the public folder
    },
  });
}

// function downloadPack() {
//   console.log("waiting for download link");
//   $.ajax({
//     url: "/download",
//     type: "GET",
//     timeout: 0,
//     error: (e) => {
//       $(".progress-bar")[0].innerText = "Error: " + e;
//       $($(".btn.btn-lg.upload-btn")[0]).attr("disabled", true);
//     },
//     success: (data) => {
//       // console.log(data);
//       // $("#upload-input").replaceWith($("#upload-input").val("").clone(true)); // Bugfix to allow multiple successive uploads
//       // window.location.href = data;
//     },
//   });
// }
