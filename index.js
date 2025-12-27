/* ==========================================================================
   VARIABLES
   ========================================================================== */
const noteInput = document.getElementById("note-input");
const tabNameInput = document.getElementById("tab-name-input");
const saveNoteBtn = document.getElementById("saveNote-btn");
const saveTabBtn = document.getElementById("saveTab-btn");
const notesList = document.getElementById("notes-list");
const tabsList = document.getElementById("tabs-list");
const tabButtons = document.querySelectorAll(".tab-button");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const tabContents = document.querySelectorAll(".tab-content");
let state = {
  notes: [],
  tabs: [],
};

/* ==========================================================================
   INIT
   ========================================================================== */
function init() {
  loadData();
  renderNotes();
  renderTabs();
  setupEventListeners();
}

function loadData() {
  const savedNotes = localStorage.getItem("notes");
  const savedTabs = localStorage.getItem("tabs");

  state.notes = savedNotes ? JSON.parse(savedNotes) : [];
  state.tabs = savedTabs ? JSON.parse(savedTabs) : [];
}

/* ==========================================================================
   LOGIC & HANDLERS
   ========================================================================== */

function getCurrentDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}

function handleTabSwitch(event) {
  const button = event.currentTarget;
  const targetTab = button.dataset.tab;

  // Update button states
  tabButtons.forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");

  // Update content visibility
  tabContents.forEach((content) => {
    content.classList.remove("active");
  });
  document.getElementById(`${targetTab}-content`).classList.add("active");
}

function handleSaveNote() {
  const noteText = noteInput.value.trim();
  if (noteText) {
    const noteObj = {
      text: noteText,
      date: getCurrentDate(),
    };
    state.notes.unshift(noteObj);
    localStorage.setItem("notes", JSON.stringify(state.notes));
    noteInput.value = "";
    renderNotes();
  }
}

function handleSaveTab() {
  const tabName = tabNameInput.value.trim();

  if (chrome && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      const tabInfo = {
        url: currentTab.url,
        title: tabName ? tabName : currentTab.title,
        date: getCurrentDate(),
      };

      state.tabs.unshift(tabInfo);
      localStorage.setItem("tabs", JSON.stringify(state.tabs));
      renderTabs();
      tabNameInput.value = "";
    });
  }
}

function handleDelete(event) {
  if (event.target.closest(".delete-btn")) {
    const button = event.target.closest(".delete-btn");
    const type = button.dataset.type;
    const index = parseInt(button.dataset.index);

    if (type === "note") {
      state.notes.splice(index, 1);
      localStorage.setItem("notes", JSON.stringify(state.notes));
      renderNotes();
    } else if (type === "tab") {
      state.tabs.splice(index, 1);
      localStorage.setItem("tabs", JSON.stringify(state.tabs));
      renderTabs();
    }
  }
}

function handleExport() {
  const exportData = {
    notes: state.notes,
    tabs: state.tabs,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const dateString = getCurrentDate().split("/").join("_");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `links_notes_fschmatz_extension_backup_${dateString}.json`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

function handleImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.style.display = "none";

  input.addEventListener("change", processImportFile);

  document.body.appendChild(input);
  input.click();

  setTimeout(() => {
    document.body.removeChild(input);
  }, 100);
}

function processImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith(".json")) {
    alert("Not JSON, Invalid file!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);

      if (
        !importedData.hasOwnProperty("notes") &&
        !importedData.hasOwnProperty("tabs")
      ) {
        alert("Invalid file!.");
        return;
      }

      state.notes = importedData.notes || [];
      state.tabs = importedData.tabs || [];

      localStorage.setItem("notes", JSON.stringify(state.notes));
      localStorage.setItem("tabs", JSON.stringify(state.tabs));

      alert("Data imported successfully!");
      renderNotes();
      renderTabs();
    } catch (error) {
      alert("Error " + error.message);
    }
  };
  reader.onerror = () => alert("Error");
  reader.readAsText(file);
}

/* ==========================================================================
   RENDER FUNCTIONS
   ========================================================================== */

function renderTabs() {
  tabsList.innerHTML = state.tabs
    .map((tab, index) => {
      const dateHtml = tab.date
        ? `<div class="item-date">${tab.date}</div>`
        : "";
      return `
        <li>
            <div class="list-item">
                <div class="item-content-wrapper">
                  <a class="item-content-tabs" href="${tab.url}" target="_blank">
                      ${tab.title}
                  </a>
                  ${dateHtml}
                </div>
                <button class="delete-btn" data-type="tab" data-index="${index}">
                   <img src="assets/delete-icon.svg" alt="delete" width="17" height="17">
                </button>
            </div>
        </li>
    `;
    })
    .join("");
}

function renderNotes() {
  notesList.innerHTML = state.notes
    .map((note, index) => {
      const isObj = typeof note === "object" && note !== null;
      const text = isObj ? note.text : note;
      const date = isObj && note.date ? note.date : "";
      const dateHtml = date ? `<div class="item-date">${date}</div>` : "";

      return `
        <li>
            <div class="list-item">
                <div class="item-content-wrapper">
                  <span class="item-content-notes">${text}</span>
                  ${dateHtml}
                </div>
                <button class="delete-btn" data-type="note" data-index="${index}">
                     <img src="assets/delete-icon.svg" alt="delete" width="17" height="17">
                </button>
            </div>
        </li>
    `;
    })
    .join("");
}

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */

function setupEventListeners() {
  // Tabs
  tabButtons.forEach((button) => {
    button.addEventListener("click", handleTabSwitch);
  });

  // Save Actions
  saveNoteBtn.addEventListener("click", handleSaveNote);
  saveTabBtn.addEventListener("click", handleSaveTab);

  // Enter Key
  noteInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSaveNote();
  });

  // Import/Export
  exportBtn.addEventListener("click", handleExport);
  importBtn.addEventListener("click", handleImport);

  // Global Clicks (Delegation for Delete)
  document.addEventListener("click", handleDelete);
}

// Start
document.addEventListener("DOMContentLoaded", init);
