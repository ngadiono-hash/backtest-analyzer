// ======================================================================
// APPLICATION STATES
// ======================================================================
export const APP_STATE = {
  EMPTY: "empty",
  PREVIEW: "preview",
  READY: "ready",
};

// ======================================================================
// EVENTS — unified namespace
// ======================================================================
export const EVENTS = {

  // ----------------------------------------------------------
  // UI → CONTROLLER
  // ----------------------------------------------------------
  UI_UPLOAD_FILE:  "ui:upload-file",
  UI_EDIT_ROW:     "ui:edit-row",
  UI_DELETE_ROW:   "ui:delete-row",
  UI_ADD_ROW:      "ui:add-row",
  UI_COMMIT_DB:    "ui:commit-db",
  UI_DELETE_ALL:   "ui:delete-all",
  UI_COPY_DATA:    "ui:copy-data",

  // ----------------------------------------------------------
  // CONTROLLER → MODEL (opsional)
  // (boleh jarang dipakai, controller bisa call function langsung)
  // ----------------------------------------------------------
  CTRL_APPLY_EDIT:   "ctrl:apply-edit",
  CTRL_APPLY_DELETE: "ctrl:apply-delete",
  CTRL_LOAD_DB:      "ctrl:load-db",

  // ----------------------------------------------------------
  // MODEL → CONTROLLER → VIEW
  // ----------------------------------------------------------
  MODEL_STATE_CHANGED:   "model:state-changed",
  MODEL_PREVIEW_UPDATED: "model:preview-updated",
  MODEL_DB_UPDATED:      "model:db-updated",
  MODEL_ROW_UPDATED:     "model:row-updated",
  MODEL_ERROR:           "model:error",
  
};

export const TIMEFRAME = "4h";
export const TIMEZONE = 7;
export const MONTH_FULL_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const MONTH_NAMES = MONTH_FULL_NAMES.map(m => m.slice(0, 3));
export const MONTHS = Object.fromEntries(MONTH_NAMES.map((m, i) => [m, i]));
export const PAIRS = {
  XAUUSD: 0.5,
  GBPJPY: 1.0, EURNZD: 1.0, EURJPY: 1.0, USDJPY: 1.0, CHFJPY: 1.0,
  AUDJPY: 1.5, CADJPY: 1.5, NZDJPY: 1.5, GBPUSD: 1.5, EURUSD: 1.5, USDCAD: 1.5,
  USDCHF: 2.0, AUDUSD: 2.0, NZDUSD: 2.0, EURGBP: 2.0,
};
