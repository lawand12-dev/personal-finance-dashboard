/* ============================================================
   FINOVA — Chart engine
   Lightweight SVG charts, no external libraries.
   Charts register a redraw fn so they can respond to resize /
   theme changes.
   ============================================================ */
"use strict";

const chartRegistry = [];
function registerChart(fn) {
  chartRegistry.push(fn);
}
function redrawCharts() {
  chartRegistry.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn(e);
    }
  });
}

function niceMax(v) {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step =
    n <= 1
      ? 1
      : n <= 1.5
        ? 1.5
        : n <= 2
          ? 2
          : n <= 2.5
            ? 2.5
            : n <= 3
              ? 3
              : n <= 4
                ? 4
                : n <= 5
                  ? 5
                  : n <= 6
                    ? 6
                    : n <= 8
                      ? 8
                      : 10;
  return step * mag;
}

function smoothPath(pts) {
  if (!pts.length) return "";
  if (pts.length === 1) return "M" + pts[0].x + "," + pts[0].y;
  let d = "M" + pts[0].x + "," + pts[0].y;
  const t = 0.17;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d +=
      " C" +
      c1x.toFixed(1) +
      "," +
      c1y.toFixed(1) +
      " " +
      c2x.toFixed(1) +
      "," +
      c2y.toFixed(1) +
      " " +
      p2.x.toFixed(1) +
      "," +
      p2.y.toFixed(1);
  }
  return d;
}

/* ---------- Area / line chart ---------- */
function renderAreaChart(container, config) {
  if (!container) return;
  const labels = config.labels;
  const series = config.series;
  const height = config.height || 280;
  const chartId = config.id || "c" + Math.random().toString(36).slice(2, 7);

  function draw() {
    const w = Math.max(320, Math.round(container.clientWidth || 600));
    const h = height;
    const pad = { t: 20, r: 18, b: 34, l: 52 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;

    let maxVal = 0;
    series.forEach((s) =>
      s.values.forEach((v) => {
        if (v > maxVal) maxVal = v;
      }),
    );
    const top = niceMax(maxVal || 10);
    const steps = 4;

    const xAt = (i) =>
      labels.length === 1 ? pad.l + iw / 2 : pad.l + (i * iw) / (labels.length - 1);
    const yAt = (v) => pad.t + ih - (Math.max(0, v) / top) * ih;

    const gridColor = cssVar("--border");
    const axisText = cssVar("--text-3");
    const surface = cssVar("--surface");

    let svg =
      '<svg viewBox="0 0 ' +
      w +
      " " +
      h +
      '" width="100%" height="' +
      h +
      '" preserveAspectRatio="none" role="img" aria-label="' +
      esc(config.ariaLabel || "Chart") +
      '">';
    svg += "<defs>";
    series.forEach((s, si) => {
      svg +=
        '<linearGradient id="' +
        chartId +
        "-g" +
        si +
        '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' +
        s.color +
        '" stop-opacity="0.22"/>' +
        '<stop offset="100%" stop-color="' +
        s.color +
        '" stop-opacity="0"/>' +
        "</linearGradient>";
    });
    svg += "</defs>";

    for (let i = 0; i <= steps; i++) {
      const val = (top / steps) * i;
      const y = yAt(val);
      svg +=
        '<line x1="' +
        pad.l +
        '" y1="' +
        y.toFixed(1) +
        '" x2="' +
        (pad.l + iw) +
        '" y2="' +
        y.toFixed(1) +
        '" stroke="' +
        gridColor +
        '" stroke-width="1"/>';
      svg +=
        '<text x="' +
        (pad.l - 10) +
        '" y="' +
        (y + 4).toFixed(1) +
        '" text-anchor="end" font-size="11" fill="' +
        axisText +
        '" font-family="Inter, sans-serif">' +
        compactMoney(val) +
        "</text>";
    }

    labels.forEach((lab, i) => {
      const step = labels.length > 8 ? 2 : 1;
      if (labels.length > 8 && i % step !== 0 && i !== labels.length - 1) return;
      svg +=
        '<text x="' +
        xAt(i).toFixed(1) +
        '" y="' +
        (h - 10) +
        '" text-anchor="middle" font-size="11" fill="' +
        axisText +
        '" font-family="Inter, sans-serif">' +
        esc(lab) +
        "</text>";
    });

    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
      const line = smoothPath(pts);
      const area =
        line +
        " L" +
        pts[pts.length - 1].x.toFixed(1) +
        "," +
        (pad.t + ih) +
        " L" +
        pts[0].x.toFixed(1) +
        "," +
        (pad.t + ih) +
        " Z";
      svg += '<path d="' + area + '" fill="url(#' + chartId + "-g" + si + ')" stroke="none"/>';
      svg +=
        '<path d="' +
        line +
        '" fill="none" stroke="' +
        s.color +
        '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
      pts.forEach((p) => {
        svg +=
          '<circle cx="' +
          p.x.toFixed(1) +
          '" cy="' +
          p.y.toFixed(1) +
          '" r="3.5" fill="' +
          surface +
          '" stroke="' +
          s.color +
          '" stroke-width="2"/>';
      });
    });

    svg +=
      '<line class="hover-guide" x1="0" y1="' +
      pad.t +
      '" x2="0" y2="' +
      (pad.t + ih) +
      '" stroke="' +
      cssVar("--border-strong") +
      '" stroke-width="1" stroke-dasharray="4 4" opacity="0"/>';
    svg += "</svg>";
    svg += '<div class="chart-tip" role="status"></div>';

    container.innerHTML = svg;

    const svgEl = container.querySelector("svg");
    const tip = container.querySelector(".chart-tip");
    const guide = container.querySelector(".hover-guide");

    function onMove(e) {
      const rect = svgEl.getBoundingClientRect();
      const scale = w / rect.width;
      const px = (e.clientX - rect.left) * scale;
      const stepX = labels.length > 1 ? iw / (labels.length - 1) : iw;
      let idx = Math.round((px - pad.l) / stepX);
      idx = Math.max(0, Math.min(labels.length - 1, idx));

      const gx = xAt(idx);
      guide.setAttribute("x1", gx);
      guide.setAttribute("x2", gx);
      guide.setAttribute("opacity", "1");

      let rows = "";
      series.forEach((s) => {
        rows +=
          '<div class="tt-row"><span><span class="tt-dot" style="background:' +
          s.color +
          '"></span>' +
          esc(s.name) +
          "</span><b>" +
          money(s.values[idx], { cents: false }) +
          "</b></div>";
      });
      tip.innerHTML =
        '<div class="tt-title">' +
        esc(config.tipLabels ? config.tipLabels[idx] : labels[idx]) +
        "</div>" +
        rows;
      tip.classList.add("show");

      const tw = tip.offsetWidth || 140;
      let left = gx - tw / 2;
      left = Math.max(4, Math.min(rect.width - tw - 4, left));
      tip.style.left = left + "px";
      tip.style.top = "6px";
    }

    function onLeave() {
      tip.classList.remove("show");
      guide.setAttribute("opacity", "0");
    }

    svgEl.addEventListener("mousemove", onMove);
    svgEl.addEventListener("mouseleave", onLeave);
  }

  draw();
  registerChart(draw);
}

/* ---------- Grouped bar chart ---------- */
Object.assign(globalThis, {
  chartRegistry,
  registerChart,
  redrawCharts,
  niceMax,
  smoothPath,
  renderAreaChart,
  renderBarChart,
  renderDonut,
});

function renderBarChart(container, config) {
  if (!container) return;
  const labels = config.labels;
  const groups = config.groups;
  const height = config.height || 300;

  function draw() {
    const w = Math.max(320, Math.round(container.clientWidth || 600));
    const h = height;
    const pad = { t: 20, r: 18, b: 34, l: 52 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;

    let maxVal = 0;
    groups.forEach((g) =>
      g.values.forEach((v) => {
        if (v > maxVal) maxVal = v;
      }),
    );
    const top = niceMax(maxVal || 10);
    const steps = 4;

    const gridColor = cssVar("--border");
    const axisText = cssVar("--text-3");

    const band = iw / labels.length;
    const inner = band * 0.62;
    const barW = inner / groups.length;
    const gap = 4;

    let svg =
      '<svg viewBox="0 0 ' +
      w +
      " " +
      h +
      '" width="100%" height="' +
      h +
      '" preserveAspectRatio="none" role="img" aria-label="' +
      esc(config.ariaLabel || "Bar chart") +
      '">';

    for (let i = 0; i <= steps; i++) {
      const val = (top / steps) * i;
      const y = pad.t + ih - (val / top) * ih;
      svg +=
        '<line x1="' +
        pad.l +
        '" y1="' +
        y.toFixed(1) +
        '" x2="' +
        (pad.l + iw) +
        '" y2="' +
        y.toFixed(1) +
        '" stroke="' +
        gridColor +
        '" stroke-width="1"/>';
      svg +=
        '<text x="' +
        (pad.l - 10) +
        '" y="' +
        (y + 4).toFixed(1) +
        '" text-anchor="end" font-size="11" fill="' +
        axisText +
        '" font-family="Inter, sans-serif">' +
        compactMoney(val) +
        "</text>";
    }

    labels.forEach((lab, i) => {
      const bandX = pad.l + i * band;
      groups.forEach((g, gi) => {
        const v = g.values[i] || 0;
        const bh = Math.max(v > 0 ? 2 : 0, (v / top) * ih);
        const x = bandX + (band - inner) / 2 + gi * (barW + gap);
        const y = pad.t + ih - bh;
        const r = Math.min(4, barW / 2);
        const d =
          "M" +
          x +
          "," +
          (y + bh) +
          " L" +
          x +
          "," +
          (y + r) +
          " Q" +
          x +
          "," +
          y +
          " " +
          (x + r) +
          "," +
          y +
          " L" +
          (x + barW - r) +
          "," +
          y +
          " Q" +
          (x + barW) +
          "," +
          y +
          " " +
          (x + barW) +
          "," +
          (y + r) +
          " L" +
          (x + barW) +
          "," +
          (y + bh) +
          " Z";
        svg +=
          '<path d="' +
          d +
          '" fill="' +
          g.color +
          '" opacity="0.92"><title>' +
          esc(lab + " — " + g.name + ": " + money(v)) +
          "</title></path>";
      });
      const step = labels.length > 8 ? 2 : 1;
      if (labels.length > 8 && i % step !== 0 && i !== labels.length - 1) return;
      svg +=
        '<text x="' +
        (bandX + band / 2).toFixed(1) +
        '" y="' +
        (h - 10) +
        '" text-anchor="middle" font-size="11" fill="' +
        axisText +
        '" font-family="Inter, sans-serif">' +
        esc(lab) +
        "</text>";
    });

    svg += "</svg>";
    container.innerHTML = svg;
  }

  draw();
  registerChart(draw);
}

/* ---------- Donut chart ---------- */
function renderDonut(container, data, total) {
  if (!container) return;
  const size = 172,
    r = 62,
    sw = 21,
    cx = size / 2,
    cy = size / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  let segs = "";

  if (!data.length || total <= 0) {
    container.innerHTML =
      '<svg viewBox="0 0 ' +
      size +
      " " +
      size +
      '">' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="none" stroke="' +
      cssVar("--border") +
      '" stroke-width="' +
      sw +
      '"/>' +
      "</svg>" +
      '<div class="donut-center"><span class="dc-label">No data</span></div>';
    return;
  }

  data.forEach((d) => {
    const frac = d.value / total;
    const len = frac * C;
    const gap = data.length > 1 ? 3 : 0;
    const drawLen = Math.max(0.5, len - gap);
    segs +=
      '<circle class="donut-seg" cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="none" stroke="' +
      d.color +
      '" stroke-width="' +
      sw +
      '" stroke-dasharray="' +
      drawLen.toFixed(2) +
      " " +
      (C - drawLen).toFixed(2) +
      '" stroke-dashoffset="' +
      (-acc).toFixed(2) +
      '" transform="rotate(-90 ' +
      cx +
      " " +
      cy +
      ')">' +
      "<title>" +
      esc(d.name) +
      " — " +
      money(d.value) +
      "</title></circle>";
    acc += len;
  });

  container.innerHTML =
    '<svg viewBox="0 0 ' +
    size +
    " " +
    size +
    '" role="img" aria-label="Spending by category">' +
    segs +
    "</svg>" +
    '<div class="donut-center">' +
    '<span class="dc-label">Spent</span>' +
    '<span class="dc-value">' +
    money(total, { cents: false }) +
    "</span>" +
    "</div>";
}
