(function () {
	var activeTabId;
	var mvcPanelPorts = {};

	chrome.tabs.onActivated.addListener(function(activeInfo) {
		activeTabId = activeInfo.tabId;
	});
	
	chrome.tabs.onRemoved.addListener(function(removeTabId, removeInfo){
		if(typeof(removeTabId) !== 'undefined' && typeof(mvcPanelPorts[removeTabId]) !== 'undefined') {	
			// console.log('Disconnecting MVC_PANEL port:' + (mvcPanelPorts[removeTabId]).name);
			(mvcPanelPorts[removeTabId]).disconnect(); // Disconnect port
			delete mvcPanelPorts[removeTabId]; // No more needed
		}	
	});
	
	// Listen for requests from MVC Content Script/MVC Panel wanting to set up a port
    chrome.runtime.onConnect.addListener(function(port) {
		if (port.name === 'MVC_APP') { // Connection request from Content Script
			console.log('Connecting to port: '+ port.name, port);
			
			port.onMessage.addListener(function(jsonMsg) {
				if (jsonMsg.event === 'HEART_BEAT') {
					port.postMessage({'status': 'ALIVE'}) ; // Send the message to confirm that MVC Inspector is alive
				} else {
					if(typeof(activeTabId) !== 'undefined' && typeof(mvcPanelPorts[activeTabId]) !== 'undefined') {	
						// console.log('Sending to MVC_PANEL port:' + (mvcPanelPorts[activeTabId]).name + ' message: '+ jsonMsg);
						(mvcPanelPorts[activeTabId]).postMessage(jsonMsg);
					}	
				}
			});			
		}
		else if (port.name === 'MVC_PANEL') { // Connection request from MVC Inspector Panel
			console.log('Connecting to port: '+ port.name, port);

			if(typeof(activeTabId) !== 'undefined') {
				port.name = port.name + "." + activeTabId;
				mvcPanelPorts[activeTabId] = port; // Cache port for further communication
			}
		}
		else {
			console.log('MVC Inspector error. Unknown port trying to connect. Not allowed. Port: '+port.name, port) ;
			return;
		}
    });
}());
