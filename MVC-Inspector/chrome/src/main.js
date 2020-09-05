function init() {
	// Draw Inspector UI
	console.log("Creating MVC Inspector Panel");
	chrome.devtools.panels.create("MVC Inspector",
                              "icon.png",
                              "mvc-inspector-panel.html",
                              function(panel) { });                              
}

init();