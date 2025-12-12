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