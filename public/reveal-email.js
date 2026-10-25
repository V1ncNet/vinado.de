(function () {
  const KEY = "vinado";
  const ENCODED_ADDRESS = [0, 0, 0, 2, 1, 1, 2, 71, 0, 0, 0, 0, 26, 5, 46, 6, 9, 14, 31, 5, 64, 2, 11, 2];

  function decodeAddress() {
    return String.fromCharCode(...ENCODED_ADDRESS.map((code, i) => code ^ KEY.charCodeAt(i % KEY.length)));
  }

  function revealEmail(event) {
    const address = decodeAddress();
    const link = document.createElement("a");
    link.href = `mailto:${address}`;
    link.textContent = address;
    event.currentTarget.replaceWith(link);
    link.focus();
  }

  const button = document.getElementById("show-email");
  button.hidden = false;
  button.addEventListener("click", revealEmail);
})();
