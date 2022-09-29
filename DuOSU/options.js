document.getElementById("resetButton").addEventListener("click", function() {
  // Delete chrome local / sync data
  chrome.storage.sync.clear(function() {
    chrome.storage.local.clear(function() {
      alert("Cleared all DuOSU data");
    });
  });
});
