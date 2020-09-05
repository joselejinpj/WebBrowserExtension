(function () {
	var port;
	
	function connectToInspector() {
		port = chrome.runtime.connect({name:'MVC_APP'});
		if(typeof(port) !== 'undefined') {		
			port.onMessage.addListener(receiveMessageFromInspector);
		}	
	}
		
	function sendMessageToInspector(jsonMsg) {
		if(typeof(port) !== 'undefined') {
			port.postMessage(jsonMsg);
		}
	}

	function receiveMessageFromInspector(jsonMsg) {
	
	}

	function receiveMessageFromMVCApp(event) {
		// We only accept messages from ourselves
		if (event.source != window) {
			return;
		}
		
		if (event.data.type && (event.data.type == "MVC_APP")) {
			// alert("Content script received: " + event.data.payload);
			sendMessageToInspector(event.data.payload);
		}
	}	
	
	connectToInspector();
	window.addEventListener("message", receiveMessageFromMVCApp);
	
	window.onload = function() {
		sendMessageToInspector({'event': 'PAGE_LOADED'});
	};
	
	document.addEventListener("DOMContentLoaded", function() {
	    var head = document.getElementsByTagName('head').item(0);
		
		var css=document.createElement("link");
		css.setAttribute('href', chrome.extension.getURL('css/mvc-debugger.css'));		  
		css.setAttribute('rel', 'stylesheet');
		css.setAttribute('type', 'text/css');
		head.appendChild(css); 
		
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.setAttribute('src', chrome.extension.getURL('mvc-debugger.js'));
		head.appendChild(script); 
	});
	
}());
	