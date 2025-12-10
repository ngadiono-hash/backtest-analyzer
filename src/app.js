
import { TradeDataModel  } from 'models/TradeDataModel.js';
// log(TradeDataModel)
import { ViewTradeData   } from 'views/ViewTradeData.js';
//log(ViewTradeData)
import { StatisticsModel } from 'models/StatisticsModel.js';
// log(StatisticsModel)
import { ViewStatistics  } from 'views/ViewStatistics.js';
//log(ViewStatistics)
import { UIManager       } from 'ui/UIManager.js';
//log(UIManager)
// log("finish import")

export class App {
	constructor() {
    log("start")
		this.data = new TradeDataModel();
		new ViewTradeData();
		this.stat = new StatisticsModel();
		new ViewStatistics();
		new UIManager(this.data, this.stat);
    log("finish")
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
// 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