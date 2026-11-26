/* Seasonal themes. The sheet's Settings tab picks one ("Theme": Beach or Thanksgiving); app.js asks here for the
   header scenery and any decorations, and style.css holds the colors under .theme-<name>. Beach is the default and
   lives in app.js/style.css directly; everything below is the Thanksgiving theme. All artwork is inline SVG so
   there are no image files to host. */
(function () {
  'use strict';

  var MAPLE = 'M50 2L57 20 70 14 66 34 84 28 78 44 96 48 80 58 86 74 64 68 56 86 52 74 52 98 48 98 48 74 44 86 36 68 14 74 20 58 4 48 22 44 16 28 34 34 30 14 43 20Z';
  var OAK = 'M50 4C58 10 62 14 60 22 70 20 74 28 66 34 76 36 78 46 68 50 78 54 76 64 66 66 72 74 66 82 58 80 60 88 54 94 50 96 46 94 40 88 42 80 34 82 28 74 34 66 24 64 22 54 32 50 22 46 24 36 34 34 26 28 30 20 40 22 38 14 42 10 50 4Z';
  var LEAF_COLORS = ['#b8361d', '#d9622b', '#e8962c', '#f0c04a', '#8c3a1a', '#c4451f'];

  function leafSVG(kind, color, size) {
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true"><path fill="' + color + '" d="' +
      (kind ? OAK : MAPLE) + '"/><path d="M50 30V98" stroke="rgba(60,20,5,.45)" stroke-width="3" fill="none"/></svg>';
  }

  // A tree line of autumn crowns along the bottom of the header, drawn behind the table.
  function treeLine() {
    var out = '', x = -20, i = 0;
    while (x < 1300) {
      var r = 20 + (i * 7) % 10, c = LEAF_COLORS[(i * 5) % LEAF_COLORS.length];
      out += '<circle cx="' + x + '" cy="' + (140 - (i * 3) % 6) + '" r="' + r + '" fill="' + c + '"/>';
      x += 30 + (i * 13) % 17;
      i++;
    }
    return '<g opacity=".88">' + out + '</g>';
  }

  // The harvest table: wine, corn, mashed potatoes, the roast turkey, pumpkin pie and a football.
  var TABLE_SCENE =
    '<svg class="tg-scene" viewBox="0 0 1280 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>' +
      '<radialGradient id="tgRoast" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#f0b45c"/><stop offset=".45" stop-color="#c8702c"/><stop offset="1" stop-color="#7f3a12"/></radialGradient>' +
      '<radialGradient id="tgBall" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#a65a26"/><stop offset="1" stop-color="#5c2c0e"/></radialGradient>' +
      '<linearGradient id="tgPlank" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5429"/><stop offset=".15" stop-color="#6e3f1c"/><stop offset="1" stop-color="#4f2b12"/></linearGradient>' +
      '<linearGradient id="tgBottle" x1="0" x2="1"><stop offset="0" stop-color="#2a0b15"/><stop offset=".35" stop-color="#5a1a2b"/><stop offset="1" stop-color="#220810"/></linearGradient>' +
    '</defs>' + treeLine() +
    // table
    '<rect y="128" width="1280" height="22" fill="url(#tgPlank)"/><rect y="128" width="1280" height="2" fill="#b07a45"/>' +
    '<path d="M0 138H1280M0 145H1280" stroke="rgba(0,0,0,.18)" stroke-width="1"/>' +
    // Everything on the table is one group (x 480-1060) so app.js can shrink it into the space beside a long bar name.
    '<g class="tg-food">' +
    // corn on the cob
    '<g transform="rotate(-28 505 110)"><ellipse cx="505" cy="108" rx="9" ry="22" fill="#f2c230"/>' +
      '<path d="M500 90V126M505 87V129M510 90V126" stroke="#d39a17" stroke-width="2" stroke-dasharray="3 2"/>' +
      '<path d="M495 118Q490 100 497 84Q498 104 506 128Z" fill="#8fa64e"/><path d="M515 118Q520 100 513 84Q512 104 504 128Z" fill="#b5a65a"/></g>' +
    // wine bottle and glass
    '<path d="M548 128Q545 128 545 124V66Q545 56 553 50L554 30H566L567 50Q575 56 575 66V124Q575 128 572 128Z" fill="url(#tgBottle)"/>' +
    '<rect x="553" y="18" width="14" height="14" rx="2" fill="#8e1b2b"/><rect x="548" y="84" width="24" height="26" rx="2" fill="#efe3c6"/>' +
    '<path d="M552 92H568M552 98H564M552 103H566" stroke="#8e1b2b" stroke-width="1.6"/><rect x="549" y="60" width="3" height="58" rx="1.5" fill="rgba(255,255,255,.22)"/>' +
    '<path d="M596 70Q596 100 610 104Q624 100 624 70Z" fill="rgba(255,255,255,.2)" stroke="rgba(255,255,255,.8)" stroke-width="1.4"/>' +
    '<path d="M597.5 84Q599 100 610 102Q621 100 622.5 84Z" fill="#7a1428"/><rect x="609" y="104" width="2" height="21" fill="rgba(255,255,255,.85)"/>' +
    '<ellipse cx="610" cy="126" rx="11" ry="2.6" fill="rgba(255,255,255,.85)"/>' +
    // mashed potatoes with butter and gravy
    '<path d="M651 108Q654 92 664 90Q668 82 676 86Q688 84 692 96Q695 102 693 108Z" fill="#f4ecd6"/>' +
    '<rect x="667" y="83" width="11" height="7" rx="1.5" fill="#f6d36b"/><path d="M679 92Q684 96 682 104" stroke="#a8642a" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M648 108Q650 128 672 128Q694 128 696 108Z" fill="#3f6e8c"/><ellipse cx="672" cy="108" rx="24" ry="4.5" fill="#5a8fb0"/>' +
    // steam over the turkey
    '<g class="tg-steam" fill="none" stroke="rgba(255,250,240,.7)" stroke-width="2.5" stroke-linecap="round">' +
      '<path d="M780 52Q772 42 780 32Q788 22 780 12"/><path d="M802 48Q794 38 802 28Q810 18 802 8"/><path d="M824 52Q816 42 824 32Q832 22 824 12"/></g>' +
    // platter, garnish, roast turkey and drumsticks
    '<ellipse cx="800" cy="124" rx="104" ry="10" fill="#f3ede1" stroke="#cbbca0" stroke-width="1.5"/><ellipse cx="800" cy="122" rx="88" ry="6.5" fill="#e6dcc8"/>' +
    '<g fill="#4f7a2b"><ellipse cx="716" cy="118" rx="12" ry="5" transform="rotate(-18 716 118)"/><ellipse cx="884" cy="118" rx="12" ry="5" transform="rotate(18 884 118)"/>' +
      '<ellipse cx="740" cy="122" rx="10" ry="4"/><ellipse cx="860" cy="122" rx="10" ry="4"/></g>' +
    '<g fill="#a51d2d"><circle cx="726" cy="121" r="3"/><circle cx="732" cy="124" r="3"/><circle cx="868" cy="124" r="3"/><circle cx="874" cy="120" r="3"/><circle cx="752" cy="125" r="2.6"/></g>' +
    '<g><circle cx="708" cy="122" r="6" fill="#f29d38"/><circle cx="708" cy="122" r="3.6" fill="#f8c56b"/><circle cx="892" cy="122" r="6" fill="#f29d38"/><circle cx="892" cy="122" r="3.6" fill="#f8c56b"/></g>' +
    '<path d="M738 104Q722 96 716 80Q714 68 726 66Q738 66 746 82Q752 94 748 104Z" fill="url(#tgRoast)"/>' +
    '<path d="M862 104Q878 96 884 80Q886 68 874 66Q862 66 854 82Q848 94 852 104Z" fill="url(#tgRoast)"/>' +
    '<path d="M730 118Q722 92 748 74Q770 58 804 60Q842 62 862 82Q878 98 870 118Z" fill="url(#tgRoast)"/>' +
    '<ellipse cx="784" cy="77" rx="28" ry="8" fill="rgba(255,236,190,.38)" transform="rotate(-12 784 77)"/>' +
    '<path d="M800 64Q807 92 800 116" stroke="rgba(120,55,18,.45)" stroke-width="2" fill="none"/>' +
    '<path d="M720 70L708 52M880 70L892 52" stroke="#f5ecd8" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M700 50l3-7 3 5 3-6 3 6 3-4-2 9h-12z M888 46l3 6 3-5 3 6 3-5 2 7-4 4h-10z" fill="#fff"/>' +
    // pumpkin pie with whipped cream
    '<path d="M905 112H975L970 126Q969 128 966 128H914Q911 128 910 126Z" fill="#b9c5cf"/>' +
    '<ellipse cx="940" cy="112" rx="35" ry="7" fill="#c96a1e"/><ellipse cx="940" cy="112" rx="35" ry="7" fill="none" stroke="#e2b26b" stroke-width="4"/>' +
    '<g fill="#fffaf0"><circle cx="934" cy="108" r="5"/><circle cx="944" cy="107" r="5.5"/><circle cx="939" cy="103" r="4.5"/></g>' +
    // football resting on the table
    '<g transform="rotate(-10 1020 117)"><path d="M988 117C1000 97 1040 97 1052 117C1040 137 1000 137 988 117Z" fill="url(#tgBall)"/>' +
      '<path d="M997 108Q1000 117 997 126M1043 108Q1040 117 1043 126" stroke="#fff" stroke-width="2.5" fill="none"/>' +
      '<path d="M1008 111H1032M1012 108V114M1018 108V114M1024 108V114M1030 108V114" stroke="#fff" stroke-width="2"/></g>' +
    '</g></svg>';

  // Leaves drifting down behind the boards; fewer, and without the spin, on Fire TV (lite mode).
  function fallingLeaves() {
    var lite = document.documentElement.classList.contains('lite'), n = lite ? 4 : 9, out = '';
    for (var i = 0; i < n; i++) {
      var left = (7 + i * (86 / n) + (i % 2) * 4).toFixed(1), dur = 16 + (i * 5) % 9, delay = -((i * 7) % dur);
      out += '<i class="lf" style="left:' + left + '%;animation-duration:' + dur + 's;animation-delay:' + delay + 's">' +
        '<b style="animation-duration:' + (5 + i % 4) + 's">' + leafSVG(i % 3 === 1, LEAF_COLORS[i % LEAF_COLORS.length], 26 + (i * 9) % 18) + '</b></i>';
    }
    return '<div class="leaves" aria-hidden="true">' + out + '</div>';
  }

  // Leaf clusters tucked over the outer top corners of the two boards.
  function cornerLeaves() {
    return '<div class="tg-corner tl" aria-hidden="true">' + leafSVG(0, '#b8361d', 58) + leafSVG(1, '#e8962c', 44) + leafSVG(0, '#f0c04a', 36) + '</div>' +
      '<div class="tg-corner tr" aria-hidden="true">' + leafSVG(1, '#d9622b', 52) + leafSVG(0, '#8c3a1a', 46) + leafSVG(0, '#f0c04a', 34) + '</div>';
  }

  // White Claw-style flavor names get a matching colored dot.
  var FLAVOR_COLORS = [[/cherry/i, '#d6284f'], [/lime/i, '#8bc34a'], [/raspberr/i, '#e8336d'], [/grapefruit/i, '#ff7a59'], [/mango/i, '#ffb02e'],
    [/watermelon/i, '#ff5c7a'], [/lemon/i, '#f7e05e'], [/pineapple/i, '#f5c542'], [/peach/i, '#ffa76b'], [/blackberr/i, '#8e44ad'], [/cranberr/i, '#b3122e'],
    [/grape(?!fruit)/i, '#8b4bb8'], [/orange|tangerine|clementine/i, '#ff8c1a'], [/apple/i, '#9ccc3c'], [/berry/i, '#c2185b']];
  function flavorColor(name) {
    for (var i = 0; i < FLAVOR_COLORS.length; i++) if (FLAVOR_COLORS[i][0].test(name)) return FLAVOR_COLORS[i][1];
    return '';
  }

  window.Themes = {
    thanksgiving: {
      eyebrow: 'Welcome',
      scene: TABLE_SCENE,
      overlay: function () { return fallingLeaves() + cornerLeaves(); }
    },
    flavorColor: flavorColor
  };
})();
