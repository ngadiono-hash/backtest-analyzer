// ~/app.js
import { _ready } from "./helpers/template.js";
import { DataModel } from './model/DataModel.js';
import { ViewData } from './view/ViewData.js';
import { StatisticsModel } from './model/StatisticsModel.js';
import { ViewStatistics } from './view/ViewStatistics.js';
import { UIManager } from './view/UIManager.js';

export class App {
	constructor() {
		this.data = new DataModel();
		this.stat = new StatisticsModel();
		this.tableTrade = new ViewData(this.data);
		new UIManager(this.data, this.stat);
	}
	
}

_ready(new App);