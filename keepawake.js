/* Keeps the TV from dropping into its screensaver / ambient mode while the display is up. Two layers, since Fire TV's
   Silk browser doesn't reliably honor the first:
   1. The Screen Wake Lock API, re-requested whenever it's lost.
   2. A playing video. Chromium holds the screen awake for a playing video whose source is a live MediaStream on a
      visible page, with no size or sound requirement (Blink's VideoWakeLock), the same thing that keeps the screen
      on during a video call. So a 16x16 canvas that repaints once a second is streamed into a tiny, muted video
      in the corner.
   app.js starts it at boot and on the remote's Select button; the Rewind button shows which layer is working. */
(function () {
  'use strict';
  var wakeLock = null, video = null, ctx = null, frame = 0, videoPlaying = false, lastError = '';

  function requestLock() {
    if (!navigator.wakeLock || document.visibilityState !== 'visible' || wakeLock) return;
    navigator.wakeLock.request('screen').then(function (l) {
      wakeLock = l;
      l.addEventListener('release', function () { wakeLock = null; });
    }, function (e) { lastError = 'wake lock: ' + (e && (e.name || e.message) || e); });
  }

  function play() {
    if (!video) return;
    var p = video.play();
    if (p && p.catch) p.catch(function (e) { lastError = 'video: ' + (e && (e.name || e.message) || e); });
  }
  function paint() {
    // Alternate two near-black shades so the stream keeps producing frames.
    frame++;
    ctx.fillStyle = frame % 2 ? '#000000' : '#010101';
    ctx.fillRect(0, 0, 16, 16);
  }
  function startVideo() {
    if (video) { if (video.paused) play(); return; }
    var canvas = document.createElement('canvas');
    if (!canvas.captureStream) { lastError = 'video: canvas streams not supported'; return; }
    canvas.width = canvas.height = 16;
    ctx = canvas.getContext('2d');
    paint();
    video = document.createElement('video');
    video.className = 'keepawake';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.srcObject = canvas.captureStream(1);
    video.addEventListener('playing', function () { videoPlaying = true; });
    video.addEventListener('pause', function () { videoPlaying = false; setTimeout(play, 1000); });
    // Outside #app, which app.js re-renders, so the video survives menu updates.
    document.body.appendChild(video);
    play();
  }

  setInterval(function () {
    if (ctx) paint();
    if (video && video.paused) play();
  }, 1000);
  setInterval(requestLock, 60 * 1000);
  document.addEventListener('visibilitychange', function () { requestLock(); if (video && video.paused) play(); });

  window.KeepAwake = {
    start: function () { requestLock(); startVideo(); },
    status: function () {
      return { wakeLock: !!wakeLock, video: !!(video && videoPlaying && !video.paused), error: lastError };
    }
  };
})();
