/* 決済目安：直近高値・安値（index.html / cfd.html 共通）
   スイングハイ = 前後 SW 本より高い1時間足。そのうち、その後まだ上抜かれていない一番新しいもの
   （= 現値の上で一番近い高値）を「直近高値」とする。安値も同じ考え方。
   直近 SW 本は未確定なので対象外。見つからないとき（高値・安値を更新中）は null。
   このファイルはGASの毎時更新では上書きされない。GAS側のHTMLには次の3か所だけ入れる：
     1) 本体の <script> の直前に  <script src="swing.js"></script>
     2) candleSvg の「var top = hi, bot = lo」の直前に  if (window.SRX) SRX.addLines(r, lines, fmt);
     3) showPair の「そのほかのライン」の行の直前に  if (window.SRX) SRX.legend(r, lines, fmt);   */
(function () {
  var SW = 3, COLOR = '#7a5bbf';

  function fmt(v) { return v == null ? '' : (Math.abs(v) >= 20 ? v.toFixed(3) : v.toFixed(5)); }

  function swings(r) {
    var c = r && r.chart; if (!c || !c.t || c.t.length < SW * 2 + 1) return null;
    var n = c.t.length, hi = null, lo = null, maxAfter = -Infinity, minAfter = Infinity;
    for (var j = n - SW; j < n; j++) { if (c.h[j] > maxAfter) maxAfter = c.h[j]; if (c.l[j] < minAfter) minAfter = c.l[j]; }
    for (var i = n - 1 - SW; i >= SW && (!hi || !lo); i--) {
      var isH = true, isL = true;
      for (var k = 1; k <= SW; k++) {
        if (!(c.h[i] >= c.h[i - k] && c.h[i] > c.h[i + k])) isH = false;
        if (!(c.l[i] <= c.l[i - k] && c.l[i] < c.l[i + k])) isL = false;
      }
      if (!hi && isH && c.h[i] > maxAfter) hi = { v: c.h[i], i: i, ago: n - 1 - i };
      if (!lo && isL && c.l[i] < minAfter) lo = { v: c.l[i], i: i, ago: n - 1 - i };
      if (c.h[i] > maxAfter) maxAfter = c.h[i];
      if (c.l[i] < minAfter) minAfter = c.l[i];
    }
    return { hi: hi, lo: lo };
  }

  // 見た目（チャートの線・ラベル、カードの行）
  var st = document.createElement('style');
  st.textContent = 'svg.ch .swg{stroke:' + COLOR + ';stroke-dasharray:1 3}svg.ch text.lh{fill:' + COLOR + '}.swl b{color:' + COLOR + '}';
  document.head.appendChild(st);

  window.SRX = {
    swings: swings,
    // チャートに線を足す（candleSvg の lines 配列に追加）
    addLines: function (r, lines, f) {
      var sw = swings(r); if (!sw) return; f = f || fmt;
      if (sw.hi) lines.push({ v: sw.hi.v, cls: 'swg', lab: '直近高値 ' + f(sw.hi.v), lc: 'lh', key: true });
      if (sw.lo) lines.push({ v: sw.lo.v, cls: 'swg', lab: '直近安値 ' + f(sw.lo.v), lc: 'lh', key: true });
    },
    // チャート上の凡例に1行足す（showPair の lines 配列に追加）
    legend: function (r, lines, f) {
      var sw = swings(r); if (!sw || (!sw.hi && !sw.lo)) return; f = f || fmt;
      lines.push('<span><i style="border-color:' + COLOR + ';border-top-style:dotted"></i>決済目安 直近高値 ' +
        (sw.hi ? f(sw.hi.v) : '更新中') + '・直近安値 ' + (sw.lo ? f(sw.lo.v) : '更新中') +
        '（前後' + SW + '本のスイングで、まだ抜かれていないもの）</span>');
    }
  };

  // 一覧のカードに「決済目安」の行を足す（建玉があれば利確側を太字）
  var data = document.getElementById('sr-data'); if (!data) return;
  var D; try { D = JSON.parse(data.textContent); } catch (e) { return; }
  var cards = {};
  [].forEach.call(document.querySelectorAll('.card.tap'), function (el) {
    var sym = (el.getAttribute('onclick') || '').split("'")[1]; if (sym) cards[sym] = el;
  });
  (D.rows || []).forEach(function (r) {
    var card = cards[r.sym], sw = swings(r); if (!card || !sw) return;
    var p = r.pos && (r.pos.CS || r.pos.H1), side = p && p.entry ? p.side : 0;
    function part(name, x, target) {
      if (!x) return name + ' 更新中';
      var t = name + ' <span class="px">' + fmt(x.v) + '</span>（' + x.ago + '本前' +
        (r.atr ? '・' + (Math.abs(x.v - r.close) / r.atr).toFixed(1) + ' ATR' : '') + '）';
      return target ? '<b>' + t + '</b>' : t;
    }
    var div = document.createElement('div');
    div.className = 'posl swl';
    div.innerHTML = '決済目安: ' + part('直近高値', sw.hi, side === 1) + ' ・ ' + part('直近安値', sw.lo, side === -1);
    card.appendChild(div);
  });
})();
