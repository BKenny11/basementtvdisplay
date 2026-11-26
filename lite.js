// Fire TV sticks (Silk, model codes starting "AFT") get a lighter look: no glows, less confetti. ?lite=1 forces it,
// ?lite=0 turns it off. Loaded in <head> so the class is set before scores.js and themes.js read it. (A separate
// file rather than an inline script so the page's Content-Security-Policy can forbid inline scripts.)
(function () {
  var q = /[?&]lite=([01])/.exec(location.search);
  if (q ? q[1] === '1' : /AFT|Silk/i.test(navigator.userAgent)) document.documentElement.className += ' lite';
})();
