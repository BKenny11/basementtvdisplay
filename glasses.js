/* Cocktail glass illustrations for the cocktail cards. The Menu tab's Glass column picks one by name (Coupe, Martini,
   Rocks, Highball, Copper mug, Wine, Flute, Margarita, Hot mug, Shot); blank or "Auto" picks one from the drink's
   name and ingredients. The liquid is tinted from the ingredients too. All drawn on a 64x80 grid. */
(function () {
  'use strict';
  var GLASS = 'rgba(255,240,220,.78)', GLASS_FILL = 'rgba(255,255,255,.1)';
  function outline(d) { return '<path d="' + d + '" fill="' + GLASS_FILL + '" stroke="' + GLASS + '" stroke-width="2" stroke-linejoin="round"/>'; }
  function stem(top) { return '<path d="M32 ' + top + 'V70" stroke="' + GLASS + '" stroke-width="2.5"/><ellipse cx="32" cy="72" rx="14" ry="3.5" fill="' + GLASS + '"/>'; }
  function ice(x, y) { return '<rect x="' + x + '" y="' + y + '" width="11" height="11" rx="2.5" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.55)" stroke-width="1" transform="rotate(12 ' + (x + 5) + ' ' + (y + 5) + ')"/>'; }
  var LIME = '<circle cx="0" cy="0" r="7" fill="#b9dc6a" stroke="#6e9a2c" stroke-width="2"/><path d="M-5 0H5M0 -5V5M-3.5 -3.5L3.5 3.5M3.5 -3.5L-3.5 3.5" stroke="#6e9a2c" stroke-width="1"/>';
  function lime(x, y) { return '<g transform="translate(' + x + ' ' + y + ')">' + LIME + '</g>'; }

  var DRAW = {
    coupe: function (c) {
      return outline('M6 12H58Q56 38 32 42Q8 38 6 12Z') + '<path d="M9 18H55Q51 37 32 39Q13 37 9 18Z" fill="' + c + '"/>' + stem(42) +
        '<circle cx="48" cy="12" r="6" fill="none" stroke="#f2b350" stroke-width="2.5"/>';
    },
    martini: function (c) {
      return outline('M5 10H59L32 42Z') + '<path d="M11 15H53L32 37Z" fill="' + c + '"/>' + stem(42) +
        '<path d="M44 4L26 26" stroke="#d9c49a" stroke-width="1.5"/><circle cx="33" cy="17" r="4.5" fill="#7d9b2f"/><circle cx="33" cy="17" r="1.6" fill="#c0392b"/>';
    },
    rocks: function (c) {
      return '<path d="M13 40H51L48 70H16Z" fill="' + c + '" opacity=".95"/>' + ice(19, 42) + ice(33, 47) +
        outline('M10 28H54L50 74H14Z') + '<path d="M44 26Q52 20 58 26" stroke="#f08a2a" stroke-width="3" fill="none" stroke-linecap="round"/>';
    },
    highball: function (c) {
      return '<path d="M19 22H45L43.5 72H20.5Z" fill="' + c + '" opacity=".95"/>' + ice(22, 26) + ice(31, 40) + ice(23, 52) +
        outline('M17 10H47L45 76H19Z') + '<path d="M38 2L33 50" stroke="#e8443a" stroke-width="2.5" stroke-linecap="round"/>' + lime(46, 12);
    },
    'copper mug': function (c) {
      return '<defs><linearGradient id="cu" x1="0" x2="1"><stop offset="0" stop-color="#e3925a"/><stop offset=".45" stop-color="#b8642f"/><stop offset="1" stop-color="#7c3f1a"/></linearGradient></defs>' +
        '<path d="M46 34Q60 34 60 47Q60 60 46 60" fill="none" stroke="#9a5226" stroke-width="5"/>' +
        '<path d="M12 26H48L46 72Q46 75 43 75H17Q14 75 14 72Z" fill="url(#cu)"/><path d="M12 26H48" stroke="#f0b07a" stroke-width="3"/>' +
        '<path d="M18 30V70" stroke="rgba(255,230,200,.35)" stroke-width="3"/>' + lime(40, 22) +
        '<path d="M22 24Q18 12 26 6M24 22Q30 12 36 12" stroke="#4f8a2b" stroke-width="3" fill="none" stroke-linecap="round"/>';
    },
    wine: function (c) {
      return outline('M15 6Q12 40 32 46Q52 40 49 6Z') + '<path d="M14.5 24Q15 42 32 44Q49 42 49.5 24Z" fill="' + c + '"/>' + stem(46);
    },
    flute: function (c) {
      return outline('M23 4Q20 42 32 48Q44 42 41 4Z') + '<path d="M22.5 16Q22 42 32 45Q42 42 41.5 16Z" fill="' + c + '"/>' +
        '<g fill="rgba(255,255,255,.7)"><circle cx="30" cy="38" r="1.4"/><circle cx="34" cy="30" r="1.2"/><circle cx="31" cy="23" r="1"/><circle cx="35" cy="40" r="1"/></g>' + stem(48);
    },
    margarita: function (c) {
      return outline('M3 12H61Q59 27 41 29Q36 31 36 36Q35 41 32 42Q29 41 28 36Q28 31 23 29Q5 27 3 12Z') +
        '<path d="M7 16H57Q54 25 40 26Q35 27 34 33Q33 37 32 37Q31 37 30 33Q29 27 24 26Q10 25 7 16Z" fill="' + c + '"/>' +
        '<path d="M5 12H59" stroke="#fff" stroke-width="3" stroke-dasharray="1.5 2.5" stroke-linecap="round"/>' + stem(42) + lime(54, 10);
    },
    'hot mug': function (c) {
      return '<path d="M44 34Q58 34 58 46Q58 58 44 58" fill="none" stroke="' + GLASS + '" stroke-width="3.5"/>' +
        '<path d="M15 30H45L43.5 70H16.5Z" fill="' + c + '"/><path d="M14.6 24H45.4L45 31H15Z" fill="#f4e9d4"/>' +
        outline('M12 18H48L46 74H14Z') +
        '<g stroke="rgba(255,250,240,.7)" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M24 14Q20 9 24 4"/><path d="M32 13Q28 8 32 3"/><path d="M40 14Q36 9 40 4"/></g>';
    },
    shot: function (c) {
      return '<path d="M23 52H41L39.5 70H24.5Z" fill="' + c + '"/>' + outline('M20 40H44L41 74H23Z') +
        '<path d="M20 40H44" stroke="#fff" stroke-width="2.5" stroke-dasharray="1.5 2.5"/>';
    }
  };
  var TYPES = Object.keys(DRAW);

  // Auto-pick: the first rule whose words appear in the drink's name (then its ingredients) wins.
  var PICK = [
    [/\bmule\b|copper/i, 'copper mug'], [/martini|cosmo|manhattan|\bgimlet/i, 'martini'], [/margarita|paloma/i, 'margarita'],
    [/mimosa|bellini|champagne|prosecco|french 75|sparkling/i, 'flute'], [/sangria|spritz|\bwine\b|mulled/i, 'wine'],
    [/hot\b|toddy|irish coffee|cocoa|coffee|cider.*warm|warm/i, 'hot mug'], [/\bshot\b|shooter|bomb\b/i, 'shot'],
    [/old fashioned|smash|sour|negroni|neat|rocks|sazerac|boulevardier/i, 'rocks'],
    [/collins|highball|tonic|soda|fizz|mojito|punch|cooler|lemonade|long island|ginger|\bfloat\b|root beer|cola|\bcoke\b/i, 'highball']
  ];
  function pick(type, name, ingredients) {
    var t = String(type || '').trim().toLowerCase();
    if (DRAW[t]) return t;
    if (t === 'mug') return 'copper mug';
    var hay = [name || '', (ingredients || []).join(' ')];
    for (var h = 0; h < hay.length; h++) for (var i = 0; i < PICK.length; i++) if (PICK[i][0].test(hay[h])) return PICK[i][1];
    return 'coupe';
  }

  // Liquid color from the name and ingredients; the fallback cycles so neighbouring cards differ.
  var TINTS = [
    [/coffee|espresso|kahl|cocoa|chocolate|stout|root beer|cola|\bcoke\b/i, '#5a3420'], [/cranberr|pomegranate|cherry|red wine|sangria|grenadine|raspberr|campari/i, '#b3122e'],
    [/blue cura|blue rasp/i, '#2f8fd8'], [/aperol|orange|pumpkin|mango|peach/i, '#ee8a2c'],
    [/cider|bourbon|whisk|rye|brandy|dark rum|maple|caramel|apple/i, '#d9822b'], [/midori|melon|lime|mint|matcha/i, '#a9cf5a'],
    [/prosecco|champagne|white wine|gin|vodka|tequila|tonic|lemon|pineapple|elderflower/i, '#f1e3a0']
  ];
  var FALLBACK = ['#e08a2e', '#b3122e', '#d9a441', '#7a1f3d'];
  function tint(name, ingredients, i) {
    var hay = (name || '') + ' ' + (ingredients || []).join(' ');
    for (var k = 0; k < TINTS.length; k++) if (TINTS[k][0].test(hay)) return TINTS[k][1];
    return FALLBACK[(i || 0) % FALLBACK.length];
  }

  function svg(type, color) {
    return '<svg class="ck-glass" viewBox="0 0 64 80" aria-hidden="true">' + (DRAW[type] || DRAW.coupe)(color) + '</svg>';
  }

  window.Glasses = { types: TYPES, pick: pick, tint: tint, svg: svg };
})();
