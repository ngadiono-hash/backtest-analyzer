// ~/app.js
import { _ready } from "./helpers/shortcut.js";
import { TradeData } from './model/TradeData.js';
import { TableData } from './view/TableData.js';
import { TradeStat } from './model/TradeStat.js';
import { TableStat } from './view/TableStat.js';
import { UIManager } from './view/UIManager.js';

export class App {
	constructor() {
		this.data = new TradeData();
		this.stat = new TradeStat();
		this.tableTrade = new TableData(this.data);
		new UIManager(this.data, this.stat);
	}
	
}

_ready(new App);