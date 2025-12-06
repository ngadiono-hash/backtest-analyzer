
import { TradeDataModel  } from './model/TradeDataModel.js';
import { ViewTradeData   } from './view/ViewTradeData.js';
import { StatisticsModel } from './model/StatisticsModel.js';
import { ViewStatistics  } from './view/ViewStatistics.js';
import { UIManager       } from './view/UIManager.js';

export class App {
	constructor() {
		this.data = new TradeDataModel();
		new ViewTradeData();
		this.stat = new StatisticsModel();
		new ViewStatistics();
		new UIManager(this.data, this.stat);
	}
	
}

window.addEventListener('DOMContentLoaded', e => {
  new App();
  document.querySelectorAll("span").forEach(s => {
    const txt = s.innerText;
    const cleaned = txt.replace(/[,\s]/g, "");
    const isNum = /^[+-]?(?:\d+(?:\.\d+)?%?|\d+(?:\.\d+)?:\d+(?:\.\d+)?)$/.test(cleaned);
    if (isNum) s.classList.add("m");
  });
});