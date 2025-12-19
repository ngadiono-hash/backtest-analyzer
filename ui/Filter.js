import { $, $$, create } from "util/template.js";

export class Filter {
  constructor({ ranges, pairs, onChange, state }) {
    this.ranges = ranges;
    this.list   = pairs;
    this.onChange = onChange;
  
    this.state = {
      range: state?.range ?? null,
      pairs: state?.pairs ?? null
    };
  
    this.el = this.render();
  }

  /* ---------- render ---------- */

  render() {
    return create("div", { className: "filter-bar" },
      this.renderRange(),
      this.renderPairs()
    );
  }

renderRange() {
  return create("div", { className: "filter-group range" },
    ...this.ranges.map(r =>
      create("button", {
        className: this.state.range === r ? "active" : "",
        onclick: () => this.toggleRange(r)
      }, r.toUpperCase())
    )
  );
}

  _rangeBtn(label, value) {
    return create("button", {
      className: this.state.range === value ? "active" : "",
      dataset: { range: value ?? "all" },
      onclick: () => this.setRange(value)
    }, label);
  }

  renderPairs() {
    return create("div", { className: "filter-group pair" },
      ...this.list.map(({ pair, count }) =>
        create("button", {
          className: this.isPairActive(pair) ? "active" : "",
          disabled: count === 0,
          onclick: () => this.togglePair(pair)
        },
          pair,
          create("small", { className: "badge" }, count)
        )
      )
    );
  }

  /* ---------- state helpers ---------- */

  isAllPairActive() {
    return this.state.pairs === null;
  }

  isPairActive(pair) {
    return this.state.pairs?.includes(pair);
  }

  /* ---------- actions ---------- */

toggleRange(range) {
  this.state.range =
    this.state.range === range ? null : range;

  this.emit();
  this.update();
}

  togglePair(pair) {
    const set = new Set(this.state.pairs ?? []);

    set.has(pair) ? set.delete(pair) : set.add(pair);

    // kosong → ALL
    this.state.pairs = set.size ? [...set] : null;

    this.emit();
    this.update();
  }

  resetPairs() {
    this.state.pairs = null;
    this.emit();
    this.update();
  }

  /* ---------- communication ---------- */

  emit() {
    this.onChange?.({
      range: this.state.range,
      pairs: this.state.pairs
    });
  }

update() {
  $$(".range button", this.el).forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.textContent.toLowerCase() === this.state.range
    );
  });

  $$(".pair button", this.el).forEach(btn => {
    btn.classList.toggle(
      "active",
      this.state.pairs?.includes(btn.textContent.trim())
    );
  });
}

  /* ---------- external update ---------- */

  updateMeta({ pairs }) {
    this.list = pairs;
    this.update();
  }
}