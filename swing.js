/* 決済目安：直近高値・安値（index.html / cfd.html 共通）
   直近 N 本（確定済みの1時間足。最新の足を含む）の最高値と最安値。
   このファイルはGASの毎時更新では上書きされない。GAS側のHTMLには次の3か所だけ入れる：
     1) 本体の <script> の直前に  <script src="swing.js"></script>
     2) candleSvg の「var top = hi, bot = lo」の直前に  if (window.SRX) SRX.addLines(r, lines, fmt);
     3) showPair の「そのほかのライン」の行の直前に  if (window.SRX) SRX.legend(r, lines, fmt);   */
(function () {
  var N = 10, COLOR = '#7a5bbf';

  function fmt(v) { return v == null ? '' : (Math.abs(v) >= 20 ? v.toFixed(3) : v.toFixed(5)); }

  function swings(r) {
    var c = r && r.chart; if (!c || !c.t || !c.t.length) return null;
    var n = c.t.length, hi = null, lo = null;
    for (var i = n - 1; i >= Math.max(0, n - N); i--) {
      if (!hi || c.h[i] > hi.v) hi = { v: c.h[i], i: i, ago: n - 1 - i };
      if (!lo || c.l[i] < lo.v) lo = { v: c.l[i], i: i, ago: n - 1 - i };
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
      if (sw.hi) lines.push({ v: sw.hi.v, cls: 'swg', lab: N + '本高値 ' + f(sw.hi.v), lc: 'lh', key: true });
      if (sw.lo) lines.push({ v: sw.lo.v, cls: 'swg', lab: N + '本安値 ' + f(sw.lo.v), lc: 'lh', key: true });
    },
    // チャート上の凡例に1行足す（showPair の lines 配列に追加）
    legend: function (r, lines, f) {
      var sw = swings(r); if (!sw) return; f = f || fmt;
      lines.push('<span><i style="border-color:' + COLOR + ';border-top-style:dotted"></i>決済目安 直近' + N + '本の高値 ' +
        f(sw.hi.v) + '・安値 ' + f(sw.lo.v) + '（最新の確定足を含む）</span>');
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
    div.innerHTML = '決済目安（直近' + N + '本）: ' + part('高値', sw.hi, side === 1) + ' ・ ' + part('安値', sw.lo, side === -1);
    card.appendChild(div);
  });
})();
