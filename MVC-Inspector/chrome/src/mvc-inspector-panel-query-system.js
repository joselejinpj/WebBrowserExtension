/*************** JS get executed in Inspected window context *******************/
function getViewsForResource(resourceKey) {
    var ret = {};
	var resultViews = new Array();
    
    $.each(mvc.get_debugger().query_system.get_views_for_resource(resourceKey), function(key, value) {
        resultViews.push(key);
    });
    
	ret.resource = resourceKey;
	ret.views = resultViews;
	
    return ret; 
}

/*************** JS callbacks from Inspected window context ********************/
function getViewsForResourceCb(qResult) {
	var qResultString = 'Resource: [' + qResult.resource + '] is used in [' + qResult.views.length +'] views.\n';
	
	for (var i = 0; i < qResult.views.length; i++) {
		qResultString = qResultString + '\n' + (i+1) + '. ' + qResult.views[i];
	}
	
	updateQuerySystemResultTextArea(qResultString);
}

/*************** JS get executed in Inspector window context *******************/
function updateQuerySystemResultTextArea(qResultString) {
	var qResultFormatted = '---Query Start---\n' + qResultString + '\n---Query End---\n\n';

	$("#querySystemResultTextArea").val(qResultFormatted + $("#querySystemResultTextArea").val()); 	
}
