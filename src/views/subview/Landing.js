
export class Landing {
  constructor({ onProcess } = {}) {
    this.onProcess = onProcess;          // callback → controller
    this.pendingFiles = [];
    this.root = CREATE("main", { class: "page-init" });

    this._renderLanding();
  }

  render() {
    $(".fab-wrapper")?.remove();
    return this.root;
  }

  _renderLanding() {
    this.root.innerHTML = "";

    const container = CREATE("div", { class: "drop-container"},
      CREATE("span", { class: "browse"}),
      CREATE("span", { class: "drop-title"}, "Drop files here"),
      CREATE("span", "or"),
    );

    const input = CREATE("input", { 
      type: "file",
      accept: ".csv",
      multiple: true,
      class: "none"
    });

    const browseBtn = CREATE("button", { class: "btn btn-info" }, "Choose Files");
    browseBtn.addEventListener("click", () => input.click());

    input.addEventListener("change", (e) => {
      this._handleIncomingFiles(e.target.files);
      input.value = "";
    });

    container.append(browseBtn, input);
    this.root.append(container);

    // drag & drop
    container.addEventListener("dragover", e => e.preventDefault());
    container.addEventListener("dragenter", () => container.classList.add("drag-active"));
    container.addEventListener("dragleave", () => container.classList.remove("drag-active"));
    container.addEventListener("drop", e => {
      e.preventDefault();
      container.classList.remove("drag-active");
      this._handleIncomingFiles(e.dataTransfer.files);
    });
  }

  _handleIncomingFiles(files) {
    if (!files?.length) return;

    [...files].forEach(f => {
      if (f.name.endsWith(".csv")) this.pendingFiles.push(f);
    });

    this._renderPendingFilesList();
  }

  _renderPendingFilesList() {
    if (!this.pendingListContainer) {
      this.pendingListContainer = CREATE("div", { class: "pending-file-list" });
      this.root.append(this.pendingListContainer);
    }

    const root = this.pendingListContainer;
    root.innerHTML = "";

    if (!this.pendingFiles.length) {
      return root.append(
        CREATE("div", { class: "no-files" }, "No files selected yet.")
      );
    }

    root.append(CREATE("h3", { class: "pending-title" }, "Files ready to process"));

    const list = CREATE("ul", { class: "pending-list" });

    this.pendingFiles.forEach((file, i) => {
      list.append(
        CREATE("li", { class: "pending-item" },
          CREATE("span", { class: "file-name" }, `${i+1}. ${file.name}`),
          CREATE("button", {
            class: "btn",
            onclick: () => this._removeFile(i)
          }, "❌")
        )
      );
    });

    root.append(list);

    root.append(
      CREATE("button", {
        class: "btn btn-success",
        onclick: () => this._processFiles()
      }, `Process ${this.pendingFiles.length} file(s)`)
    );
  }

  _removeFile(i) {
    this.pendingFiles.splice(i, 1);
    this._renderPendingFilesList();
  }

  async _processFiles() {
    if (!this.pendingFiles.length) return;
  
    // Selalu ubah menjadi File
    const files = await Promise.all(
      this.pendingFiles.map(f => this._toFile(f))
    );
  
  
    // Baca konten
    const contents = await Promise.all(
      files.map(async file => {
        const text = await file.text();
        return text;
      })
    );
  
    const mergedText = contents.map(t => t.trim()).join("\n");
    const mergedName = files
      .map(f => f.name.replace(/\.csv$/i, ""))
      .join("-");  
  
    // Emit hasil raw
    this.onProcess?.({
      raw: mergedText,
      fileName: mergedName
    });
  
    // Clear
    this.pendingFiles = [];
    this._renderPendingFilesList();
  }
  
  async _toFile(f) {
    if (f instanceof File) return f;
    if (f.getFile) return await f.getFile();
  
    throw new Error("Unknown file object");
  }

}