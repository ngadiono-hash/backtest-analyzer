
import { TradeDataModel  } from 'models/TradeDataModel.js';
import { ViewTradeData   } from 'views/ViewTradeData.js';
import { StatisticsModel } from 'models/StatisticsModel.js';
import { ViewStatistics  } from 'views/ViewStatistics.js';
import { UIManager       } from 'ui/UIManager.js';


export class App {
	constructor() {
		this.data = new TradeDataModel();
		new ViewTradeData(this.data);
		new StatisticsModel();
		new ViewStatistics();
		new UIManager(this.data);
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